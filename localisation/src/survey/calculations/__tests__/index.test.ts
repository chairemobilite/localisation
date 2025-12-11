/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { calculateAccessibilityAndRouting, calculateMonthlyCost } from '../index';
import { Address } from '../../common/types';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { mortgageMonthlyPayment } from '../mortgage';
import { getAccessibilityMapFromAddress } from '../routingAndAccessibility';

jest.mock('../mortgage', () => ({
        mortgageMonthlyPayment: jest.fn()
}));
const mockMortgageMonthlyPayment = mortgageMonthlyPayment as jest.MockedFunction<typeof mortgageMonthlyPayment>;
// Mock the getAccessibilityMapFromAddress function
jest.mock('../routingAndAccessibility', () => ({
    getAccessibilityMapFromAddress: jest.fn()
}));
const mockGetAccessibilityMapFromAddress = getAccessibilityMapFromAddress as jest.MockedFunction<
    typeof getAccessibilityMapFromAddress
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
    });

    describe('Rent scenarios', () => {
        it('should calculate monthly cost for rent with utilities included', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rent: 1200,
                areUtilitiesIncluded: true
            };

            const result = calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBe(1200);
        });

        it('should calculate monthly cost for rent with utilities not included', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rent: 1200,
                areUtilitiesIncluded: false,
                utilities: 150
            };

            const result = calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBe(1350);
        });

        it('should return null for rent when rent amount is missing', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                areUtilitiesIncluded: true
            };

            const result = calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
        });

        it('should return null for rent when utilities are not included but utilities amount is missing', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rent: 1200,
                areUtilitiesIncluded: false
            };

            const result = calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
        });
    });

    describe('Buy/Mortgage scenarios', () => {
        it('should calculate monthly cost for owned home with mortgage', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriod: '25',
                taxes: 3600,
                utilities: 200
            };
            mockMortgageMonthlyPayment.mockReturnValueOnce(1000); // Mocked mortgage payment

            const result = calculateMonthlyCost(address, mockInterview);

            // Expected: mortgage payment: 1000
            // Plus taxes: 3600/12 = 300
            // Plus utilities: 200
            // Total around 1500
            expect(result.housingCostMonthly).toEqual(1500);
            expect(mockMortgageMonthlyPayment).toHaveBeenCalledWith(300000, 0.05, 300);
        });

        it('should calculate monthly cost for owned home without taxes', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriod: '25',
                utilities: 200
            };

            mockMortgageMonthlyPayment.mockReturnValueOnce(1000); // Mocked mortgage payment

            const result = calculateMonthlyCost(address, mockInterview);

            // Expected: mortgage payment + utilities (no taxes)
            expect(result.housingCostMonthly).toEqual(1200);
            expect(mockMortgageMonthlyPayment).toHaveBeenCalledWith(300000, 0.05, 300);
        });

        it('should calculate monthly cost for owned home without utilities', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriod: '25',
                taxes: 3600
            };

            mockMortgageMonthlyPayment.mockReturnValueOnce(1000); // Mocked mortgage payment

            const result = calculateMonthlyCost(address, mockInterview);

            // Expected: mortgage payment + taxes/12
            expect(result.housingCostMonthly).toEqual(1300);
            expect(mockMortgageMonthlyPayment).toHaveBeenCalledWith(300000, 0.05, 300);
        });

        it('should calculate monthly cost for owned home with 0 mortgage', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 0,
                interestRate: 5,
                amortizationPeriod: '25',
                taxes: 3600,
                utilities: 200
            };

            const result = calculateMonthlyCost(address, mockInterview);

            // Expected: mortgage payment: 0
            // Plus taxes: 3600/12 = 300
            // Plus utilities: 200
            // Total around 500
            expect(result.housingCostMonthly).toEqual(500);
            expect(mockMortgageMonthlyPayment).not.toHaveBeenCalled();
        });

        it('should return null when mortgage amount is missing', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                interestRate: 5,
                amortizationPeriod: '25'
            };

            const result = calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
            expect(mockMortgageMonthlyPayment).not.toHaveBeenCalled();
        });

        it('should return null when interest rate is missing', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                amortizationPeriod: '25'
            };

            const result = calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
            expect(mockMortgageMonthlyPayment).not.toHaveBeenCalled();
        });

        it('should return null when amortization period is missing', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5
            };

            const result = calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
            expect(mockMortgageMonthlyPayment).not.toHaveBeenCalled();
        });

        it('should return null when amortization period is invalid', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriod: 'invalid' as any
            };

            const result = calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
            expect(mockMortgageMonthlyPayment).not.toHaveBeenCalled();
        });
    });

    describe('Edge cases and error scenarios', () => {
        it('should return null for unknown ownership type', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'lease' as any
            };

            const result = calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
        });

        it('should return null for missing ownership type', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1'
            };

            const result = calculateMonthlyCost(address, mockInterview);

            expect(result.housingCostMonthly).toBeNull();
        });

        it('should handle zero interest rate mortgage', () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 0,
                amortizationPeriod: '25'
            };

            mockMortgageMonthlyPayment.mockReturnValueOnce(1000); // Mocked mortgage payment

            const result = calculateMonthlyCost(address, mockInterview);

            // Expected: mortgage payment only
            expect(result.housingCostMonthly).toEqual(1000);
            expect(mockMortgageMonthlyPayment).toHaveBeenCalledWith(300000, 0, 300);
        });
    });

    describe('Income percentage calculation', () => {
        it.todo('should return null when income is missing');

        it.todo('should return correct percentage of income for housing cost');
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

    const mockAccessibilityMap: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> = {
        type: 'FeatureCollection',
        features: [
            {
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
                properties: {}
            }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('successful accessibility calculation', () => {
        it('should return accessibility map for valid address', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            mockGetAccessibilityMapFromAddress.mockResolvedValueOnce(mockAccessibilityMap);

            const result = await calculateAccessibilityAndRouting(address, mockInterview);

            expect(result.accessibilityMap).toEqual(mockAccessibilityMap);
            expect(mockGetAccessibilityMapFromAddress).toHaveBeenCalledWith(address);
            expect(mockGetAccessibilityMapFromAddress).toHaveBeenCalledTimes(1);
        });

        it('should handle multiple features in accessibility map', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            const multiFeatureMap: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> = {
                type: 'FeatureCollection',
                features: [
                    mockAccessibilityMap.features[0],
                    {
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
                        properties: {}
                    }
                ]
            };

            mockGetAccessibilityMapFromAddress.mockResolvedValueOnce(multiFeatureMap);

            const result = await calculateAccessibilityAndRouting(address, mockInterview);

            expect(result.accessibilityMap).toEqual(multiFeatureMap);
            expect(result.accessibilityMap?.features).toHaveLength(2);
        });
    });

    describe('error handling', () => {
        it('should return null accessibility map when getAccessibilityMapFromAddress returns null', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1'
                // No geography
            };

            mockGetAccessibilityMapFromAddress.mockResolvedValueOnce(null);

            const result = await calculateAccessibilityAndRouting(address, mockInterview);

            expect(result.accessibilityMap).toBeNull();
            expect(mockGetAccessibilityMapFromAddress).toHaveBeenCalledWith(address);
        });

        it('should handle promise rejection from getAccessibilityMapFromAddress', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            mockGetAccessibilityMapFromAddress.mockRejectedValueOnce(new Error('Service error'));

            await expect(calculateAccessibilityAndRouting(address, mockInterview)).rejects.toThrow('Service error');
        });
    });

    describe('different address types', () => {
        it('should calculate accessibility for rent address', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rent: 1200,
                areUtilitiesIncluded: true,
                geography: mockGeography
            };

            mockGetAccessibilityMapFromAddress.mockResolvedValueOnce(mockAccessibilityMap);

            const result = await calculateAccessibilityAndRouting(address, mockInterview);

            expect(result.accessibilityMap).toEqual(mockAccessibilityMap);
        });

        it('should calculate accessibility for owned address', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriod: '25',
                geography: mockGeography
            };

            mockGetAccessibilityMapFromAddress.mockResolvedValueOnce(mockAccessibilityMap);

            const result = await calculateAccessibilityAndRouting(address, mockInterview);

            expect(result.accessibilityMap).toEqual(mockAccessibilityMap);
        });

        it('should calculate accessibility for address without ownership info', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            mockGetAccessibilityMapFromAddress.mockResolvedValueOnce(mockAccessibilityMap);

            const result = await calculateAccessibilityAndRouting(address, mockInterview);

            expect(result.accessibilityMap).toEqual(mockAccessibilityMap);
        });
    });

    describe('empty results', () => {
        it('should handle empty feature collection', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            const emptyMap: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> = {
                type: 'FeatureCollection',
                features: []
            };

            mockGetAccessibilityMapFromAddress.mockResolvedValueOnce(emptyMap);

            const result = await calculateAccessibilityAndRouting(address, mockInterview);

            expect(result.accessibilityMap).toEqual(emptyMap);
            expect(result.accessibilityMap?.features).toHaveLength(0);
        });
    });

    describe('function behavior', () => {
        it('should await the accessibility map promise', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            let promiseResolved = false;
            mockGetAccessibilityMapFromAddress.mockImplementation(
                () =>
                    new Promise((resolve) => {
                        setTimeout(() => {
                            promiseResolved = true;
                            resolve(mockAccessibilityMap);
                        }, 10);
                    })
            );

            const result = await calculateAccessibilityAndRouting(address, mockInterview);

            expect(promiseResolved).toBe(true);
            expect(result.accessibilityMap).toEqual(mockAccessibilityMap);
        });
    });
});
