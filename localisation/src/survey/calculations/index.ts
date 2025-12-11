import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { Address } from '../common/types';
import { mortgageMonthlyPayment } from './mortgage';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { getAccessibilityMapFromAddress } from './routingAndAccessibility';

const calculateMonthlyHousingCost = (address: Address): number | null => {
    switch (address.ownership) {
    case 'rent': {
        // Rent + utilities if not included
        if (
            typeof address.rent !== 'number' ||
                (address.areUtilitiesIncluded === false && typeof address.utilities !== 'number')
        ) {
            console.error(
                'Incomplete rent or utilities information for address when calculating monthly housing cost'
            );
            return null;
        }
        if (address.areUtilitiesIncluded === false) {
            return address.rent! + address.utilities!;
        }
        return address.rent;
    }
    case 'buy': {
        if (
            typeof address.mortgage !== 'number' ||
                typeof address.interestRate !== 'number' ||
                typeof address.amortizationPeriod !== 'string'
        ) {
            console.error('Incomplete mortgage information for address when calculating monthly housing cost');
            return null;
        }
        const amortizationPeriodYears = parseInt(address.amortizationPeriod, 10);
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
        const taxesMonthly = typeof address.taxes === 'number' ? address.taxes / 12 : 0;
        const utilitiesMonthly = typeof address.utilities === 'number' ? address.utilities : 0;
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

/**
 * Calculate the monthly cost associated with an address
 * @param address The address for which to calculate the costs
 * @param interview The complete interview object
 * @returns
 */
export const calculateMonthlyCost = (
    address: Address,
    interview: InterviewAttributes
): { housingCostMonthly: number | null; housingCostPercentageOfIncome: number | null } => {
    // Calculate the housing cost
    const housingCost = calculateMonthlyHousingCost(address);
    const housingCostPercentage =
        housingCost !== null ? calculatePercentageIncomeForHousing(housingCost, interview) : null;

    // TODO Add the cost of car ownership associated with this address

    // TODO Add cost of transportation options associated with this address
    return {
        housingCostMonthly: housingCost,
        housingCostPercentageOfIncome: housingCostPercentage
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
): Promise<{ accessibilityMap: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> | null }> => {
    const accessibilityMapPromise = getAccessibilityMapFromAddress(address);

    // TODO Add routing calculations here to each destination in the interview

    const accessibilityMap = await accessibilityMapPromise;

    return {
        accessibilityMap
    };
};
