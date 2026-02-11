import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import type {
    Address,
    AddressAccessibilityMapsDurations,
    CalculationResults,
    RoutingByModeDistanceAndTime
} from '../common/types';
import { CarCategory, CarEngine } from '../common/types';
import { mortgageMonthlyPayment } from './mortgage';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import {
    getAccessibilityMapFromAddressForSimpleModes,
    getAccessibilityMapFromAddressForTransit,
    getRoutingFromAddressToDestination
} from './routingAndAccessibility';
import { getDestinationsArray, getVehiclesArray } from '../common/customHelpers';
import { carCostAverageCaa } from './carCost';
import { predictCarOwnership } from './carOwnership';
import { getPersonsArray } from 'evolution-common/lib/services/odSurvey/helpers';

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

// Calculate the percentage of income spent on housing and transport
const calculatePercentageIncomeForHousingAndTransport = ({
    monthlyHousingCost,
    monthlyTransportCost,
    interview
}: {
    monthlyHousingCost: number;
    monthlyTransportCost: number;
    interview: InterviewAttributes;
}): number | null => {
    const income = getResponse(interview, 'household.income');

    // Return null if income is not available
    if (income === null || income === undefined) {
        return null;
    }

    // Return null for special values
    if (income === 'dontKnow' || income === 'refusal') {
        return null;
    }

    let averageAnnualIncome: number;

    // Handle numeric income values (number or numeric string)
    if (typeof income === 'number') {
        averageAnnualIncome = income;
    } else if (typeof income === 'string') {
        // If it's a range string, parse min/max and compute the average
        if (income.includes('_')) {
            // Parse the income range value (e.g., '010000_019999' -> [10000, 19999])
            const parts = income.split('_');
            if (parts.length !== 2) {
                console.error('Invalid income format:', income);
                return null;
            }

            // Parse the income range values
            const minIncome = parseInt(parts[0], 10);
            const maxIncome = parseInt(parts[1], 10);

            // Return null if the income range values are not numbers
            if (isNaN(minIncome) || isNaN(maxIncome)) {
                console.error('Invalid income range values:', income);
                return null;
            }

            // For open-ended upper brackets (e.g., "210000_999999" meaning "$210,000 and more"),
            // use the minimum value instead of the average to avoid underestimating the percentage.
            // Using the average would skew results significantly (e.g., someone earning $220,000
            // would have their percentage calculated as if they earned ~$605,000, making it appear
            // much lower than it actually is).
            const isOpenEndedUpperBracket = maxIncome >= 999999;
            if (isOpenEndedUpperBracket) {
                averageAnnualIncome = minIncome;
            } else {
                // Calculate the average of the income range for closed ranges
                averageAnnualIncome = (minIncome + maxIncome) / 2;
            }
        } else {
            // String doesn't contain underscore, so it should be a direct numeric value (e.g., "60000" or "60000.5")
            // First, remove any leading/trailing whitespace
            const trimmedIncome = income.trim();

            // Validate that the string contains only digits and optionally a decimal point
            // Regex explanation: ^[0-9]+(\.[0-9]+)?$
            //   ^[0-9]+     - Start of string, one or more digits
            //   (\.[0-9]+)? - Optionally: a decimal point followed by one or more digits
            //   $           - End of string
            // This ensures the entire string is numeric (e.g., "60000", "60000.5") and rejects invalid formats
            const isNumericString = /^[0-9]+(\.[0-9]+)?$/.test(trimmedIncome);

            if (!isNumericString) {
                console.error('Invalid income format:', income);
                return null;
            }

            // Parse the validated numeric string to a number
            averageAnnualIncome = parseFloat(trimmedIncome);
        }
    } else {
        // Invalid type
        console.error('Invalid income type:', income);
        return null;
    }

    // Validate that averageAnnualIncome is a positive number to avoid division by zero
    if (!isFinite(averageAnnualIncome) || averageAnnualIncome <= 0) {
        return null;
    }

    // Calculate annual housing cost and transport cost
    const annualHousingCost = monthlyHousingCost * 12;
    const annualTransportCost = monthlyTransportCost * 12;

    // Calculate percentage of income spent on housing and transport
    const percentage = ((annualHousingCost + annualTransportCost) / averageAnnualIncome) * 100;

    // Round to 0 decimal places
    return Math.round(percentage);
};

// Calculate the monthly car cost for the interview. Will return null if there is missing information or any unknown category/engine
const calculateMonthlyCarCost = async (address: Address, interview: InterviewAttributes): Promise<number | null> => {
    // FIXME Should we differentiate between no cars or missing information on car number?
    const vehicles = getVehiclesArray(interview);
    const persons = getPersonsArray({ interview });
    const householdSize: number = Object.values(persons).length;
    const numberPermits: number = Object.values(persons).filter(
        (person) => person.drivingLicenseOwnership === 'yes'
    ).length;
    const income: string = String(getResponse(interview, 'household.income'));
    // This is the average annual car cost for a gas-powered passenger car from the CAA table.
    const AVERAGE_CAR_COST_ANNUAL = carCostAverageCaa(CarCategory.PassengerCar, CarEngine.Gas);

    try {
        // Predict the number of cars owned by the household
        const numberOfCarsPredicted = await predictCarOwnership({
            geography: address.geography,
            householdSize,
            numberPermits,
            income
        });

        // Define variables to store the total annual car cost, average annual car cost, and monthly car cost
        let totalCarCostAnnual = 0; // This is the total annual car cost for all current vehicles
        let averageCarCostAnnual = 0; // This is the average annual car cost for all current vehicles
        let monthlyCarsCost = 0; // This is the monthly car cost for all predicted cars

        // Calculate the total annual car cost for all current vehicles
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

        // We want the average annual car cost across all current vehicles,
        // then convert that average to a monthly value.
        if (vehicles.length === 0) {
            // No current vehicles: use the average car cost annual
            averageCarCostAnnual = AVERAGE_CAR_COST_ANNUAL;
        } else {
            // There are current vehicles: use the average car cost annual
            averageCarCostAnnual = totalCarCostAnnual / vehicles.length;
        }

        // Calculate the monthly car cost for all predicted cars
        monthlyCarsCost = numberOfCarsPredicted * (averageCarCostAnnual / 12);

        // Return monthly car cost
        return monthlyCarsCost;
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
export const calculateMonthlyCost = async (
    address: Address,
    interview: InterviewAttributes
): Promise<CalculationResults> => {
    // Calculate the housing cost
    const monthlyHousingCost = calculateMonthlyHousingCost(address);

    // Calculate the cost of car ownership associated with this address (for now it does not depend on the address, but leave it here for future extensions)
    const monthlyCarCost = await calculateMonthlyCarCost(address, interview);

    // Calculate the percentage of income spent on housing and transport
    const housingAndTransportCostPercentageOfIncome =
        monthlyHousingCost !== null && monthlyCarCost !== null
            ? calculatePercentageIncomeForHousingAndTransport({
                monthlyHousingCost,
                // TODO: Right now, we are only considering the car cost; we should add the cost of other transport options like public transport, biking, etc.
                monthlyTransportCost: monthlyCarCost,
                interview
            })
            : null;

    // Calculate the total monthly cost
    const totalMonthlyCost =
        monthlyHousingCost !== null && monthlyCarCost !== null ? monthlyHousingCost + monthlyCarCost : null;

    // TODO Add cost of transportation options associated with this address
    return {
        housingCostMonthly: monthlyHousingCost,
        carCostMonthly: monthlyCarCost,
        housingAndTransportCostPercentageOfIncome,
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
    accessibilityMapsByMode: Address['accessibilityMapsByMode'];
    routingTimeDistances: { [destinationUuid: string]: RoutingByModeDistanceAndTime | null } | null;
}> => {
    // Make sure there is a scenario defined, otherwise, do a quick return
    const scenario = config.trRoutingScenarios?.SE;
    if (scenario === undefined) {
        console.error('No transit scenario defined in config for routing and accessibility calculation');
        return {
            accessibilityMapsByMode: null,
            routingTimeDistances: null
        };
    }

    // Calculate the accessibility map for the address
    const transitAccessibilityMapPromise = getAccessibilityMapFromAddressForTransit(address);
    const simpleModesAccessibilityMapsPromise = getAccessibilityMapFromAddressForSimpleModes(address);

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

    const transitAccessibilityMap = await transitAccessibilityMapPromise;
    const simpleModesAccessibilityMaps = await simpleModesAccessibilityMapsPromise;

    await Promise.all(routingPromises);

    return {
        accessibilityMapsByMode: {
            transit: transitAccessibilityMap,
            ...simpleModesAccessibilityMaps
        },
        routingTimeDistances
    };
};
