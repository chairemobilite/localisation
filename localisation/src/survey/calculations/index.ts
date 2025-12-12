import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { Address, CalculationResults, RoutingByModeDistanceAndTime } from '../common/types';
import { mortgageMonthlyPayment } from './mortgage';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { getAccessibilityMapFromAddress, getRoutingFromAddressToDestination } from './routingAndAccessibility';
import { getDestinationsArray, getVehiclesArray } from '../common/customHelpers';
import { carCostAverageCaa } from './carcost';

const calculateMonthlyHousingCost = (address: Address): number | null => {
    switch (address.ownership) {
    case 'rent': {
        // Rent + utilities if not included
        if (
            typeof address.rentMonthly !== 'number' ||
                (address.areUtilitiesIncluded === false && typeof address.utilitiesMonthly !== 'number')
        ) {
            console.error(
                'Incomplete rent or utilities information for address when calculating monthly housing cost'
            );
            return null;
        }
        if (address.areUtilitiesIncluded === false) {
            return address.rentMonthly! + address.utilitiesMonthly!;
        }
        return address.rentMonthly;
    }
    case 'buy': {
        if (
            typeof address.mortgage !== 'number' ||
                typeof address.interestRate !== 'number' ||
                typeof address.amortizationPeriodInYears !== 'string'
        ) {
            console.error('Incomplete mortgage information for address when calculating monthly housing cost');
            return null;
        }
        const amortizationPeriodYears = parseInt(address.amortizationPeriodInYears, 10);
        if (isNaN(amortizationPeriodYears)) {
            console.error('Invalid amortization period for address when calculating monthly housing cost');
            return null;
        }
        // Add a fallback for zero mortgage
        const monthlyMortgagePayment =
                address.mortgage === 0
                    ? 0
                    : mortgageMonthlyPayment(
                        address.mortgage,
                        address.interestRate / 100, // Convert percentage to decimal
                        amortizationPeriodYears * 12 // Convert years to months
                    );
        const taxesMonthly = typeof address.taxesYearly === 'number' ? address.taxesYearly / 12 : 0;
        const utilitiesMonthly = typeof address.utilitiesMonthly === 'number' ? address.utilitiesMonthly : 0;
        return monthlyMortgagePayment + taxesMonthly + utilitiesMonthly;
    }
    default: {
        console.error('Unknown ownership type for address when calculating monthly housing cost');
        return null;
    }
    }
};

const calculatePercentageIncomeForHousing = (
    monthlyHousingCost: number,
    interview: InterviewAttributes
): number | null => {
    const income = getResponse(interview, 'household.income');
    // TODO Implement
    return null;
};

// Calculate the monthly car cost for the interview. Will return null if there is missing information or any unknown category/engine
const calculateMonthlyCarCost = (_address: Address, interview: InterviewAttributes): number | null => {
    // FIXME Should we differentiate between no cars or missing information on car number?
    const vehicles = getVehiclesArray(interview);
    try {
        let totalCarCostAnnual = 0;
        for (let i = 0; i < vehicles.length; i++) {
            const vehicle = vehicles[i];
            if (!vehicle.category || !vehicle.engineType) {
                throw new Error(
                    'Incomplete vehicle information when calculating car cost for vehicle ' + vehicle._sequence
                );
            }
            // Simple cost model based on category and engine type
            // FIXME This will throw an error if category or engine type are not found, See if we want to catch and act on that information. Now it just fails and return null
            totalCarCostAnnual += carCostAverageCaa(vehicle.category, vehicle.engineType);
        }
        return totalCarCostAnnual / 12; // Return monthly cost
    } catch (error) {
        console.error('Error calculating monthly car cost', error instanceof Error ? error.message : error);
        return null;
    }
};

/**
 * Calculate the monthly cost associated with an address
 * @param address The address for which to calculate the costs
 * @param interview The complete interview object
 * @returns
 */
export const calculateMonthlyCost = (address: Address, interview: InterviewAttributes): CalculationResults => {
    // Calculate the housing cost
    const housingCost = calculateMonthlyHousingCost(address);
    const housingCostPercentage =
        housingCost !== null ? calculatePercentageIncomeForHousing(housingCost, interview) : null;

    // Calculate the cost of car ownership associated with this address (for now it does not depend on the address, but leave it here for future extensions)
    const carCostMonthly = calculateMonthlyCarCost(address, interview);

    const totalMonthlyCost = housingCost !== null && carCostMonthly !== null ? housingCost + carCostMonthly : null;

    // TODO Add cost of transportation options associated with this address
    return {
        housingCostMonthly: housingCost,
        housingCostPercentageOfIncome: housingCostPercentage,
        carCostMonthly: carCostMonthly,
        totalCostMonthly: totalMonthlyCost
    };
};

/**
 * Calculate accessibility map from address and routing to destinations
 * @param address The address from which to calculate accessibility and routing
 * @param interview The complete interview object
 * @returns The accessibility map and routing information
 */
export const calculateAccessibilityAndRouting = async (
    address: Address,
    interview: InterviewAttributes
): Promise<{
    accessibilityMap: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> | null;
    routingTimeDistances: { [destinationUuid: string]: RoutingByModeDistanceAndTime | null } | null;
}> => {
    // Make sure there is a scenario defined, otherwise, do a quick return
    const scenario = config.trRoutingScenarios?.SE;
    if (scenario === undefined) {
        console.error('No transit scenario defined in config for routing and accessibility calculation');
        return {
            accessibilityMap: null,
            routingTimeDistances: null
        };
    }

    // Calculate the accessibility map for the address
    const accessibilityMapPromise = getAccessibilityMapFromAddress(address);

    // Calculate routing to each destination in the interview
    const destinations = getDestinationsArray(interview);
    const routingTimeDistances: { [destinationUuid: string]: RoutingByModeDistanceAndTime | null } = {};
    const routingPromises: Promise<void>[] = [];
    for (let i = 0; i < destinations.length; i++) {
        const destination = destinations[i];
        routingPromises.push(
            getRoutingFromAddressToDestination(address, destination)
                .then((result) => {
                    routingTimeDistances[destination._uuid] = result;
                })
                .catch((error) => {
                    console.error('Error getting routing from address to destination', error);
                    routingTimeDistances[destination._uuid] = null;
                })
        );
    }

    const accessibilityMap = await accessibilityMapPromise;

    await Promise.all(routingPromises);

    return {
        accessibilityMap,
        routingTimeDistances
    };
};
