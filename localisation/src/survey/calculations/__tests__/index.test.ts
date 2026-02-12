/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import * as Status from 'chaire-lib-common/lib/utils/Status';
import { calculateAccessibilityAndRouting, calculateMonthlyCost } from '../index';
import { Address, AddressAccessibilityMapsDurations, Destination, RoutingByModeDistanceAndTime } from '../../common/types';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { mortgageMonthlyPayment } from '../mortgage';
import { predictCarOwnership } from '../carOwnership';
import { getAccessibilityMapFromAddressForSimpleModes, getAccessibilityMapFromAddressForTransit, getRoutingFromAddressToDestination } from '../routingAndAccessibility';

jest.mock('../mortgage', () => ({
    mortgageMonthlyPayment: jest.fn()
}));
const mockMortgageMonthlyPayment = mortgageMonthlyPayment as jest.MockedFunction<typeof mortgageMonthlyPayment>;
jest.mock('../carOwnership', () => ({
    predictCarOwnership: jest.fn()
}));
const mockPredictCarOwnership = predictCarOwnership as jest.MockedFunction<typeof predictCarOwnership>;
// Mock the getAccessibilityMapFromAddress function
jest.mock('../routingAndAccessibility', () => ({
    getAccessibilityMapFromAddressForTransit: jest.fn(),
    getAccessibilityMapFromAddressForSimpleModes: jest.fn(),
    getRoutingFromAddressToDestination: jest.fn()
}));
const mockGetAccessibilityMapFromAddressForTransit = getAccessibilityMapFromAddressForTransit as jest.MockedFunction<
    typeof getAccessibilityMapFromAddressForTransit
>;
const mockGetAccessibilityMapFromAddressForSimpleModes = getAccessibilityMapFromAddressForSimpleModes as jest.MockedFunction<
    typeof getAccessibilityMapFromAddressForSimpleModes
>;
const mockGetRoutingFromAddressToDestination = getRoutingFromAddressToDestination as jest.MockedFunction<
    typeof getRoutingFromAddressToDestination
>;

describe('calculateMonthlyCost', () => {
    const mockInterview: InterviewAttributes = {
        id: 1,
        uuid: 'test-uuid',
        participant_id: 1,
        is_completed: false,
        response: {
            household: {
                income: 60000
            } as any
        },
        validations: {},
        is_valid: true
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Keep tests deterministic: by default, assume no predicted cars.
        mockPredictCarOwnership.mockResolvedValue(Status.createOk(0));
    });

    describe('Rent scenarios', () => {
        it('should calculate monthly cost for rent with utilities included', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const result = await calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBe(1200);
        });

        it('should calculate monthly cost for rent with utilities not included', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: false,
                utilitiesMonthly: 150
            };

            const result = await calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBe(1350);
        });

        it('should return null for rent when rent amount is missing', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                areUtilitiesIncluded: true
            };

            const result = await calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
        });

        it('should return null for rent when utilities are not included but utilities amount is missing', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: false
            };

            const result = await calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
        });
    });

    describe('Buy/Mortgage scenarios', () => {
        it('should calculate monthly cost for owned home with mortgage', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriodInYears: '25',
                taxesYearly: 3600,
                utilitiesMonthly: 200
            };
            mockMortgageMonthlyPayment.mockReturnValueOnce(1000); // Mocked mortgage payment

            const result = await calculateMonthlyCost(address, mockInterview);

            // Expected: mortgage payment: 1000
            // Plus taxes: 3600/12 = 300
            // Plus utilities: 200
            // Total around 1500
            expect(result.housingCostMonthly).toEqual(1500);
            expect(mockMortgageMonthlyPayment).toHaveBeenCalledWith(300000, 0.05, 300);
        });

        it('should calculate monthly cost for owned home without taxes', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriodInYears: '25',
                utilitiesMonthly: 200
            };

            mockMortgageMonthlyPayment.mockReturnValueOnce(1000); // Mocked mortgage payment

            const result = await calculateMonthlyCost(address, mockInterview);

            // Expected: mortgage payment + utilities (no taxes)
            expect(result.housingCostMonthly).toEqual(1200);
            expect(mockMortgageMonthlyPayment).toHaveBeenCalledWith(300000, 0.05, 300);
        });

        it('should calculate monthly cost for owned home without utilities', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriodInYears: '25',
                taxesYearly: 3600
            };

            mockMortgageMonthlyPayment.mockReturnValueOnce(1000); // Mocked mortgage payment

            const result = await calculateMonthlyCost(address, mockInterview);

            // Expected: mortgage payment + taxes/12
            expect(result.housingCostMonthly).toEqual(1300);
            expect(mockMortgageMonthlyPayment).toHaveBeenCalledWith(300000, 0.05, 300);
        });

        it('should calculate monthly cost for owned home with 0 mortgage', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 0,
                interestRate: 5,
                amortizationPeriodInYears: '25',
                taxesYearly: 3600,
                utilitiesMonthly: 200
            };

            const result = await calculateMonthlyCost(address, mockInterview);

            // Expected: mortgage payment: 0
            // Plus taxes: 3600/12 = 300
            // Plus utilities: 200
            // Total around 500
            expect(result.housingCostMonthly).toEqual(500);
            expect(mockMortgageMonthlyPayment).not.toHaveBeenCalled();
        });

        it('should return null when mortgage amount is missing', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                interestRate: 5,
                amortizationPeriodInYears: '25'
            };

            const result = await calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
            expect(mockMortgageMonthlyPayment).not.toHaveBeenCalled();
        });

        it('should return null when interest rate is missing', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                amortizationPeriodInYears: '25'
            };

            const result = await calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
            expect(mockMortgageMonthlyPayment).not.toHaveBeenCalled();
        });

        it('should return null when amortization period is missing', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5
            };

            const result = await calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
            expect(mockMortgageMonthlyPayment).not.toHaveBeenCalled();
        });

        it('should return null when amortization period is invalid', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriodInYears: 'invalid' as any
            };

            const result = await calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
            expect(mockMortgageMonthlyPayment).not.toHaveBeenCalled();
        });
    });

    describe('Edge cases and error scenarios', () => {
        it('should return null for unknown ownership type', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'lease' as any
            };

            const result = await calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
        });

        it('should return null for missing ownership type', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1'
            };

            const result = await calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
        });

        it('should handle zero interest rate mortgage', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 0,
                amortizationPeriodInYears: '25'
            };

            mockMortgageMonthlyPayment.mockReturnValueOnce(1000); // Mocked mortgage payment

            const result = await calculateMonthlyCost(address, mockInterview);

            // Expected: mortgage payment only
            expect(result.housingCostMonthly).toEqual(1000);
            expect(mockMortgageMonthlyPayment).toHaveBeenCalledWith(300000, 0, 300);
        });
    });

    describe('Income percentage calculation', () => {
        it.each([
            { income: 60000, description: 'number' },
            { income: '60000', description: 'numeric string' }
        ])('should return correct percentage for numeric income ($description)', async ({ income }) => {
            const interview = _cloneDeep(mockInterview);
            interview.response.household = { income } as any;

            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            // (1200 * 12) / 60000 * 100 = 24
            const result = await calculateMonthlyCost(address, interview);
            expect(result.housingAndTransportCostPercentageOfIncome).toBe(24);
        });

        it('should return correct percentage for income range string', async () => {
            const interview = _cloneDeep(mockInterview);
            interview.response.household = { income: '050000_059999' } as any;
            // Make sure there are no vehicles influencing transport cost
            interview.response.cars = {};

            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 2000,
                areUtilitiesIncluded: true
            };

            // averageAnnualIncome = (50000 + 59999) / 2 = 54999.5
            // annualCost = 2000 * 12 = 24000
            // percentage = 24000 / 54999.5 * 100 = 43.6 -> rounded to 0 decimals => 44
            const result = await calculateMonthlyCost(address, interview);
            expect(result.housingAndTransportCostPercentageOfIncome).toBe(44);
        });

        it.each([
            { household: {}, description: 'when income is missing' },
            { household: { income: 0 }, description: 'when income is 0 to avoid division by zero' },
            { household: { income: 'dontKnow' }, description: 'for special income value dontKnow' },
            { household: { income: 'refusal' }, description: 'for special income value refusal' }
        ])('should return null $description', async ({ household }) => {
            const interview = _cloneDeep(mockInterview);
            interview.response.household = household as any;

            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const result = await calculateMonthlyCost(address, interview);
            expect(result.housingAndTransportCostPercentageOfIncome).toBeNull();
        });

        it('should use minimum value for open-ended upper bracket to avoid underestimating percentage', async () => {
            const interview = _cloneDeep(mockInterview);
            // Open-ended bracket: "$210,000 and more" (210000_999999)
            interview.response.household = { income: '210000_999999' } as any;
            // Make sure there are no vehicles influencing transport cost
            interview.response.cars = {};

            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 2000,
                areUtilitiesIncluded: true
            };

            // For open-ended bracket, we use the minimum (210000) instead of average
            // If we used average: (210000 + 999999) / 2 = 604999.5
            //   percentage = 24000 / 604999.5 * 100 = 4% (severely underestimated!)
            // Using minimum: 210000
            //   percentage = 24000 / 210000 * 100 = 11.4 -> rounded to 0 decimals => 11
            // This gives a more conservative (higher) estimate that doesn't underestimate
            // the percentage for someone earning, say, $220,000
            const result = await calculateMonthlyCost(address, interview);
            expect(result.housingAndTransportCostPercentageOfIncome).toBe(11);
        });
    });

    describe('Vehicle cost calculation', () => {
        it('should return carCostMonthly as 0 when there are no vehicles', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const interviewNoVehicles = _cloneDeep(mockInterview);
            interviewNoVehicles.response.cars = {};

            const result = await calculateMonthlyCost(address, interviewNoVehicles);

            expect(result.carCostMonthly).toBe(0);
            expect(result.housingCostMonthly).toBe(1200);
            expect(result.totalCostMonthly).toBe(1200);
            expect(result.currentNumberOfVehicles).toBe(0);
            expect(result.predictedNumberOfVehicles).toBe(0);
        });

        it('should return carCostMonthly as 0 when vehicles field is undefined', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const interviewUndefinedVehicles = _cloneDeep(mockInterview);
            // Don't set cars field at all

            const result = await calculateMonthlyCost(address, interviewUndefinedVehicles);

            expect(result.carCostMonthly).toBe(0);
            expect(result.housingCostMonthly).toBe(1200);
            expect(result.totalCostMonthly).toBe(1200);
            expect(result.currentNumberOfVehicles).toBe(0);
            expect(result.predictedNumberOfVehicles).toBe(0);
        });

        it('should calculate carCostMonthly correctly for one vehicle', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const interviewOneVehicle = _cloneDeep(mockInterview);
            interviewOneVehicle.response.cars = {
                'car-1': {
                    _sequence: 1,
                    _uuid: 'car-1',
                    category: 'passengerCar' as any,
                    engineType: 'electric' as any
                }
            };
            mockPredictCarOwnership.mockResolvedValueOnce(Status.createOk(1));

            const result = await calculateMonthlyCost(address, interviewOneVehicle);

            // Average CAA cost for passenger car electric is ~5947.69/year = ~495.64/month
            expect(result.carCostMonthly).toBeGreaterThan(490);
            expect(result.carCostMonthly).toBeLessThan(500);
            expect(result.housingCostMonthly).toBe(1200);
            expect(result.totalCostMonthly).toBeGreaterThan(1690);
            expect(result.totalCostMonthly).toBeLessThan(1700);
            expect(result.currentNumberOfVehicles).toBe(1);
            expect(result.predictedNumberOfVehicles).toBe(1);
        });

        it('should calculate carCostMonthly correctly for three vehicles', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1500,
                areUtilitiesIncluded: true
            };

            const interviewThreeVehicles = _cloneDeep(mockInterview);
            interviewThreeVehicles.response.cars = {
                'car-1': {
                    _sequence: 1,
                    _uuid: 'car-1',
                    category: 'passengerCar' as any,
                    engineType: 'gas' as any
                },
                'car-2': {
                    _sequence: 2,
                    _uuid: 'car-2',
                    category: 'suv' as any,
                    engineType: 'hybrid' as any
                },
                'car-3': {
                    _sequence: 3,
                    _uuid: 'car-3',
                    category: 'pickup' as any,
                    engineType: 'electric' as any
                }
            };
            mockPredictCarOwnership.mockResolvedValueOnce(Status.createOk(3));

            const result = await calculateMonthlyCost(address, interviewThreeVehicles);

            // Sum of costs: passengerCar/gas (~9399) + suv/hybrid (~7831) + pickup/electric (~10440) = ~27670/year = ~2305/month
            expect(result.carCostMonthly).not.toBeNull();
            expect(result.carCostMonthly).toBeGreaterThan(2200);
            expect(result.carCostMonthly).toBeLessThan(2400);
            expect(result.housingCostMonthly).toBe(1500);
            expect(result.totalCostMonthly).toBeGreaterThan(3700);
            expect(result.totalCostMonthly).toBeLessThan(3900);
            expect(result.currentNumberOfVehicles).toBe(3);
            expect(result.predictedNumberOfVehicles).toBe(3);
        });

        it('should return null carCostMonthly when vehicle has missing category', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const interviewMissingCategory = _cloneDeep(mockInterview);
            interviewMissingCategory.response.cars = {
                'car-1': {
                    _sequence: 1,
                    _uuid: 'car-1',
                    engineType: 'electric' as any
                    // Missing category
                }
            };

            const result = await calculateMonthlyCost(address, interviewMissingCategory);

            expect(result.carCostMonthly).toBeNull();
            expect(result.housingCostMonthly).toBe(1200);
            expect(result.totalCostMonthly).toBeNull();
            expect(result.currentNumberOfVehicles).toBe(1);
            expect(result.predictedNumberOfVehicles).toBe(0);
        });

        it('should return null carCostMonthly when vehicle has missing engineType', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const interviewMissingEngine = _cloneDeep(mockInterview);
            interviewMissingEngine.response.cars = {
                'car-1': {
                    _sequence: 1,
                    _uuid: 'car-1',
                    category: 'passengerCar' as any
                    // Missing engineType
                }
            };

            const result = await calculateMonthlyCost(address, interviewMissingEngine);

            expect(result.carCostMonthly).toBeNull();
            expect(result.housingCostMonthly).toBe(1200);
            expect(result.totalCostMonthly).toBeNull();
            expect(result.currentNumberOfVehicles).toBe(1);
            expect(result.predictedNumberOfVehicles).toBe(0);
        });

        it('should return null carCostMonthly when vehicle has unknown category', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const interviewUnknownCategory = _cloneDeep(mockInterview);
            interviewUnknownCategory.response.cars = {
                'car-1': {
                    _sequence: 1,
                    _uuid: 'car-1',
                    category: 'unknownCategory' as any,
                    engineType: 'electric' as any
                }
            };

            const result = await calculateMonthlyCost(address, interviewUnknownCategory);

            expect(result.carCostMonthly).toBeNull();
            expect(result.housingCostMonthly).toBe(1200);
            expect(result.totalCostMonthly).toBeNull();
            expect(result.currentNumberOfVehicles).toBe(1);
            expect(result.predictedNumberOfVehicles).toBe(0);
        });

        it('should return null carCostMonthly when vehicle has unknown engineType', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const interviewUnknownEngine = _cloneDeep(mockInterview);
            interviewUnknownEngine.response.cars = {
                'car-1': {
                    _sequence: 1,
                    _uuid: 'car-1',
                    category: 'passengerCar' as any,
                    engineType: 'unknownEngine' as any
                }
            };

            const result = await calculateMonthlyCost(address, interviewUnknownEngine);

            expect(result.carCostMonthly).toBeNull();
            expect(result.housingCostMonthly).toBe(1200);
            expect(result.totalCostMonthly).toBeNull();
            expect(result.currentNumberOfVehicles).toBe(1);
            expect(result.predictedNumberOfVehicles).toBe(0);
        });

        it('should return null carCostMonthly when vehicle combination is not available', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const interviewInvalidCombo = _cloneDeep(mockInterview);
            interviewInvalidCombo.response.cars = {
                'car-1': {
                    _sequence: 1,
                    _uuid: 'car-1',
                    category: 'pickup' as any,
                    engineType: 'pluginHybrid' as any // This combination is not available in CAA data
                }
            };

            const result = await calculateMonthlyCost(address, interviewInvalidCombo);

            expect(result.carCostMonthly).toBeNull();
            expect(result.housingCostMonthly).toBe(1200);
            expect(result.totalCostMonthly).toBeNull();
            expect(result.currentNumberOfVehicles).toBe(1);
            expect(result.predictedNumberOfVehicles).toBe(0);
        });

        it('should return null carCostMonthly when one vehicle out of many has missing data', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const interviewMixedVehicles = _cloneDeep(mockInterview);
            interviewMixedVehicles.response.cars = {
                'car-1': {
                    _sequence: 1,
                    _uuid: 'car-1',
                    category: 'passengerCar' as any,
                    engineType: 'electric' as any
                },
                'car-2': {
                    _sequence: 2,
                    _uuid: 'car-2',
                    category: 'suv' as any
                    // Missing engineType
                },
                'car-3': {
                    _sequence: 3,
                    _uuid: 'car-3',
                    category: 'pickup' as any,
                    engineType: 'electric' as any
                }
            };

            const result = await calculateMonthlyCost(address, interviewMixedVehicles);

            expect(result.carCostMonthly).toBeNull();
            expect(result.housingCostMonthly).toBe(1200);
            expect(result.totalCostMonthly).toBeNull();
            expect(result.currentNumberOfVehicles).toBe(3);
            expect(result.predictedNumberOfVehicles).toBe(0);
        });

        it('should handle vehicles with nicknames', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const interviewWithNickname = _cloneDeep(mockInterview);
            interviewWithNickname.response.cars = {
                'car-1': {
                    _sequence: 1,
                    _uuid: 'car-1',
                    nickname: 'My Tesla',
                    category: 'passengerCar' as any,
                    engineType: 'electric' as any
                }
            };
            mockPredictCarOwnership.mockResolvedValueOnce(Status.createOk(1));

            const result = await calculateMonthlyCost(address, interviewWithNickname);

            expect(result.carCostMonthly).toBeGreaterThan(490);
            expect(result.carCostMonthly).toBeLessThan(500);
            expect(result.housingCostMonthly).toBe(1200);
            expect(result.totalCostMonthly).toBeGreaterThan(1690);
            expect(result.totalCostMonthly).toBeLessThan(1700);
            expect(result.currentNumberOfVehicles).toBe(1);
            expect(result.predictedNumberOfVehicles).toBe(1);
        });

        it('should calculate carCostMonthly with prediction and average cost when it differs from current vehicle count', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1500,
                areUtilitiesIncluded: true
            };

            // Household has 3 cars
            const interviewThreeVehicles = _cloneDeep(mockInterview);
            interviewThreeVehicles.response.cars = {
                'car-1': {
                    _sequence: 1,
                    _uuid: 'car-1',
                    category: 'passengerCar' as any,
                    engineType: 'gas' as any
                },
                'car-2': {
                    _sequence: 2,
                    _uuid: 'car-2',
                    category: 'suv' as any,
                    engineType: 'hybrid' as any
                },
                'car-3': {
                    _sequence: 3,
                    _uuid: 'car-3',
                    category: 'pickup' as any,
                    engineType: 'electric' as any
                }
            };
            // Predict 1 car
            mockPredictCarOwnership.mockResolvedValueOnce(Status.createOk(1));

            const result = await calculateMonthlyCost(address, interviewThreeVehicles);

            // Sum of costs: passengerCar/gas (~9399) + suv/hybrid (~7831) + pickup/electric (~10440) = ~27670/year = ~2305/month, for one vehicle / 3 = ~768/month
            expect(result.carCostMonthly).not.toBeNull();
            expect(result.carCostMonthly).toBeGreaterThan(760);
            expect(result.carCostMonthly).toBeLessThan(770);
            expect(result.housingCostMonthly).toBe(1500);
            expect(result.totalCostMonthly).toBeGreaterThan(2260);
            expect(result.totalCostMonthly).toBeLessThan(2270);
            expect(result.currentNumberOfVehicles).toBe(3);
            expect(result.predictedNumberOfVehicles).toBe(1);
        });

        it('should calculate carCostMonthly with default average if car predicted, but no current car', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1500,
                areUtilitiesIncluded: true
            };

            // Household has no cars currently
            const interviewNoVehicles = _cloneDeep(mockInterview);
            interviewNoVehicles.response.cars = {
        
            };
            // Predict 1 car
            mockPredictCarOwnership.mockResolvedValueOnce(Status.createOk(1));

            const result = await calculateMonthlyCost(address, interviewNoVehicles);

            // average is 9399.17$/year (passengerCar/gas) = 783,25$/month
            expect(result.carCostMonthly).not.toBeNull();
            expect(result.carCostMonthly).toBeGreaterThan(780);
            expect(result.carCostMonthly).toBeLessThan(790);
            expect(result.housingCostMonthly).toBe(1500);
            expect(result.totalCostMonthly).toBeGreaterThan(2280);
            expect(result.totalCostMonthly).toBeLessThan(2290);
            expect(result.currentNumberOfVehicles).toBe(0);
            expect(result.predictedNumberOfVehicles).toBe(1);
        });
    });
});

describe('calculateAccessibilityAndRouting', () => {

    const mockInterview: InterviewAttributes = {
        id: 1,
        uuid: 'test-uuid',
        participant_id: 1,
        is_completed: false,
        response: {},
        validations: {},
        is_valid: true
    };

    const mockGeography: GeoJSON.Feature<GeoJSON.Point> = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [-73.5, 45.5]
        },
        properties: {}
    };

    const mockAccessibilityMapOneMode: AddressAccessibilityMapsDurations = {
        duration15Minutes: {
            type: 'Feature',
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [
                        [
                            [-73.51, 45.51],
                            [-73.49, 45.51],
                            [-73.49, 45.49],
                            [-73.51, 45.49],
                            [-73.51, 45.51]
                        ]
                    ]
                ]
            },
            properties: {
                durationSeconds: 15 * 60,
                areaSqM: 4000000
            }
        },
        duration30Minutes:{
            type: 'Feature',
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [
                        [
                            [-73.52, 45.52],
                            [-73.48, 45.52],
                            [-73.48, 45.48],
                            [-73.52, 45.48],
                            [-73.52, 45.52]
                        ]
                    ]
                ]
            },
            properties: {
                durationSeconds: 30 * 60,
                areaSqM: 4000000
            }
        },
        duration45Minutes: {
            type: 'Feature',
            geometry: {
                type: 'MultiPolygon',
                coordinates: [
                    [
                        [
                            [-72.53, 45.53],
                            [-72.47, 45.53],
                            [-72.47, 45.47],
                            [-72.53, 45.47],
                            [-72.53, 45.53]
                        ]
                    ]
                ]
            },
            properties: {
                durationSeconds: 45 * 60,
                areaSqM: 4000000
            }
        }
    };

    const mockAccessibilityMap = {
        walking: mockAccessibilityMapOneMode,
        cycling: mockAccessibilityMapOneMode,
        driving: mockAccessibilityMapOneMode,
        transit: mockAccessibilityMapOneMode
    };

    const mockDestination1: Destination = {
        _sequence: 1,
        _uuid: 'destination-1',
        name: 'Work',
        geography: {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [-73.6, 45.6]
            },
            properties: {}
        }
    };

    const mockDestination2: Destination = {
        _sequence: 2,
        _uuid: 'destination-2',
        name: 'School',
        geography: {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [-73.55, 45.55]
            },
            properties: {}
        }
    };

    const mockInterviewDestinations = {
        'destination-1': mockDestination1,
        'destination-2': mockDestination2
    };

    const mockRoutingResult1: RoutingByModeDistanceAndTime = {
        _uuid: 'destination-1',
        _sequence: 1,
        resultsByMode: {
            walking: { _uuid: 'walking', _sequence: 0, distanceMeters: 1000, travelTimeSeconds: 720 },
            cycling: { _uuid: 'cycling', _sequence: 1, distanceMeters: 1200, travelTimeSeconds: 240 },
            driving: { _uuid: 'driving', _sequence: 2, distanceMeters: 1500, travelTimeSeconds: 180 },
            transit: { _uuid: 'transit', _sequence: 3, distanceMeters: 1300, travelTimeSeconds: 600 }
        }
    };

    const mockRoutingResult2: RoutingByModeDistanceAndTime = {
        _uuid: 'destination-2',
        _sequence: 2,
        resultsByMode: {
            walking: { _uuid: 'walking', _sequence: 0, distanceMeters: 500, travelTimeSeconds: 360 },
            cycling: { _uuid: 'cycling', _sequence: 1, distanceMeters: 600, travelTimeSeconds: 120 },
            driving: { _uuid: 'driving', _sequence: 2, distanceMeters: 800, travelTimeSeconds: 90 },
            transit: { _uuid: 'transit', _sequence: 3, distanceMeters: 700, travelTimeSeconds: 300 }
        }
    };

    let testInterview: InterviewAttributes;

    beforeEach(() => {
        jest.clearAllMocks();
        // Set up default mock return values
        mockGetAccessibilityMapFromAddressForTransit.mockResolvedValue(mockAccessibilityMapOneMode);
        mockGetAccessibilityMapFromAddressForSimpleModes.mockResolvedValue({
            walking: mockAccessibilityMapOneMode,
            cycling: mockAccessibilityMapOneMode,
            driving: mockAccessibilityMapOneMode
        });
        testInterview = _cloneDeep(mockInterview);
        config.trRoutingScenarios = {
            SE: 'testScenario'
        } as any;
    });

    describe('successful accessibility and routing calculation', () => {
        it('should return accessibility map and routing results for valid address with destinations', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            // Set the destinations in the interview response with 2 destinations
            testInterview.response.destinations = mockInterviewDestinations;
            mockGetRoutingFromAddressToDestination
                .mockResolvedValueOnce(mockRoutingResult1)
                .mockResolvedValueOnce(mockRoutingResult2);

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(result.accessibilityMapsByMode).toEqual(mockAccessibilityMap);
            expect(result.routingTimeDistances).toEqual({
                'destination-1': mockRoutingResult1,
                'destination-2': mockRoutingResult2
            });
            expect(mockGetAccessibilityMapFromAddressForTransit).toHaveBeenCalledWith(address);
            expect(mockGetRoutingFromAddressToDestination).toHaveBeenCalledTimes(2);
            expect(mockGetRoutingFromAddressToDestination).toHaveBeenCalledWith(address, mockDestination1);
            expect(mockGetRoutingFromAddressToDestination).toHaveBeenCalledWith(address, mockDestination2);
        });

        it('should return accessibility map with no routing when there are no destinations', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            // Set the destinations in the interview response with no destination
            testInterview.response.destinations = {};

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(result.accessibilityMapsByMode).toEqual(mockAccessibilityMap);
            expect(result.routingTimeDistances).toEqual({});
            expect(mockGetAccessibilityMapFromAddressForTransit).toHaveBeenCalledWith(address);
            expect(mockGetRoutingFromAddressToDestination).not.toHaveBeenCalled();
        });

        it('should handle single destination routing', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            // Set the destinations in the interview response with 1 destination
            testInterview.response.destinations = {
                'destination-1': mockDestination1
            };
            mockGetRoutingFromAddressToDestination.mockResolvedValueOnce(mockRoutingResult1);

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(result.accessibilityMapsByMode).toEqual(mockAccessibilityMap);
            expect(result.routingTimeDistances).toEqual({
                'destination-1': mockRoutingResult1
            });
            expect(mockGetRoutingFromAddressToDestination).toHaveBeenCalledTimes(1);
            expect(mockGetRoutingFromAddressToDestination).toHaveBeenCalledWith(address, mockDestination1);
        });
    });

    describe('error handling', () => {
        it('should return null accessibility map and empty routing when getAccessibilityMapFromAddressForTransit returns null', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1'
                // No geography
            };

            mockGetAccessibilityMapFromAddressForTransit.mockResolvedValueOnce(null);

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(result.accessibilityMapsByMode).toEqual({
                transit: null,
                walking: mockAccessibilityMapOneMode,
                cycling: mockAccessibilityMapOneMode,
                driving: mockAccessibilityMapOneMode
            });
            expect(result.routingTimeDistances).toEqual({});
            expect(mockGetAccessibilityMapFromAddressForTransit).toHaveBeenCalledWith(address);
        });

        it('should handle promise rejection from getAccessibilityMapFromAddress', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            mockGetAccessibilityMapFromAddressForTransit.mockRejectedValueOnce(new Error('Service error'));

            await expect(calculateAccessibilityAndRouting(address, testInterview)).rejects.toThrow('Service error');
        });

        it('should handle partial routing failures', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            // Set the destinations in the interview response with 2 destinations
            testInterview.response.destinations = mockInterviewDestinations;
            mockGetRoutingFromAddressToDestination
                .mockResolvedValueOnce(mockRoutingResult1)
                .mockRejectedValueOnce(new Error('Routing failed for destination 2'));

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(mockGetRoutingFromAddressToDestination).toHaveBeenCalledTimes(2);
            expect(result.accessibilityMapsByMode).toEqual(mockAccessibilityMap);
            expect(result.routingTimeDistances).toEqual({
                'destination-1': mockRoutingResult1,
                'destination-2': null
            });
        });
    });

    describe('different address types', () => {
        it('should calculate accessibility and routing for rent address', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true,
                geography: mockGeography
            };

            // Set the destinations in the interview response with 1 destination
            testInterview.response.destinations = {
                'destination-1': mockDestination1
            };
            mockGetRoutingFromAddressToDestination.mockResolvedValueOnce(mockRoutingResult1);

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(result.accessibilityMapsByMode).toEqual(mockAccessibilityMap);
        });

        it('should calculate accessibility for owned address', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriodInYears: '25',
                geography: mockGeography
            };

            mockGetAccessibilityMapFromAddressForTransit.mockResolvedValueOnce(mockAccessibilityMapOneMode);

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(result.accessibilityMapsByMode).toEqual(mockAccessibilityMap);
            // No destination
            expect(result.routingTimeDistances).toEqual({});
        });

        it('should calculate accessibility and routing for buy address', async () => {
            const address: Address = {
                _sequence: 2,
                _uuid: 'address-2',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriodInYears: '25',
                geography: mockGeography
            };

            // Set the destinations in the interview response with 1 destination
            testInterview.response.destinations = {
                'destination-2': mockDestination2
            };
            mockGetRoutingFromAddressToDestination.mockResolvedValueOnce(mockRoutingResult2);

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(result.accessibilityMapsByMode).toEqual(mockAccessibilityMap);
            expect(result.routingTimeDistances).toEqual({
                'destination-2': mockRoutingResult2
            });
        });

        it('should calculate accessibility for address without ownership info', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            // Set the destinations in the interview response with no destination
            testInterview.response.destinations = {};

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(result.accessibilityMapsByMode).toEqual(mockAccessibilityMap);
            expect(result.routingTimeDistances).toEqual({});
        });
    });

    describe('function behavior', () => {
        it('should execute accessibility and routing promises in parallel', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            let accessibilityResolved = false;
            let routingResolved = false;

            mockGetAccessibilityMapFromAddressForTransit.mockImplementation(
                () =>
                    new Promise((resolve) => {
                        setTimeout(() => {
                            accessibilityResolved = true;
                            resolve(mockAccessibilityMapOneMode);
                        }, 10);
                    })
            );

            // Set the destinations in the interview response with 1 destination
            testInterview.response.destinations = {
                'destination-1': mockDestination1
            };
            mockGetRoutingFromAddressToDestination.mockImplementation(
                () =>
                    new Promise((resolve) => {
                        setTimeout(() => {
                            routingResolved = true;
                            resolve(mockRoutingResult1);
                        }, 10);
                    })
            );

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(accessibilityResolved).toBe(true);
            expect(routingResolved).toBe(true);
            expect(result.accessibilityMapsByMode).toEqual(mockAccessibilityMap);
            expect(result.routingTimeDistances).toEqual({
                'destination-1': mockRoutingResult1
            });
        });

        it('should handle multiple routing promises with Promise.all', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            // Set the destinations in the interview response with no destination
            testInterview.response.destinations = mockInterviewDestinations;

            let routing1Resolved = false;
            let routing2Resolved = false;

            mockGetRoutingFromAddressToDestination
                .mockImplementationOnce(() =>
                    new Promise((resolve) => {
                        setTimeout(() => {
                            routing1Resolved = true;
                            resolve(mockRoutingResult1);
                        }, 10);
                    })
                )
                .mockImplementationOnce(() =>
                    new Promise((resolve) => {
                        setTimeout(() => {
                            routing2Resolved = true;
                            resolve(mockRoutingResult2);
                        }, 10);
                    })
                );

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(routing1Resolved).toBe(true);
            expect(routing2Resolved).toBe(true);
            expect(result.routingTimeDistances).toEqual({
                'destination-1': mockRoutingResult1,
                'destination-2': mockRoutingResult2
            });
        });
    });
});
