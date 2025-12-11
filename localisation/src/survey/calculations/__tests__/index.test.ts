/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { calculateAccessibilityAndRouting, calculateMonthlyCost } from '../index';
import { Address, Destination, RoutingByModeDistanceAndTime } from '../../common/types';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { mortgageMonthlyPayment } from '../mortgage';
import { getAccessibilityMapFromAddress, getRoutingFromAddressToDestination } from '../routingAndAccessibility';

jest.mock('../mortgage', () => ({
        mortgageMonthlyPayment: jest.fn()
}));
const mockMortgageMonthlyPayment = mortgageMonthlyPayment as jest.MockedFunction<typeof mortgageMonthlyPayment>;
// Mock the getAccessibilityMapFromAddress function
jest.mock('../routingAndAccessibility', () => ({
    getAccessibilityMapFromAddress: jest.fn(),
    getRoutingFromAddressToDestination: jest.fn()
}));
const mockGetAccessibilityMapFromAddress = getAccessibilityMapFromAddress as jest.MockedFunction<
    typeof getAccessibilityMapFromAddress
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
    }

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
        mockGetAccessibilityMapFromAddress.mockResolvedValue(mockAccessibilityMap);
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

            expect(result.accessibilityMap).toEqual(mockAccessibilityMap);
            expect(result.routingTimeDistances).toEqual({
                'destination-1': mockRoutingResult1,
                'destination-2': mockRoutingResult2
            });
            expect(mockGetAccessibilityMapFromAddress).toHaveBeenCalledWith(address);
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

            expect(result.accessibilityMap).toEqual(mockAccessibilityMap);
            expect(result.routingTimeDistances).toEqual({});
            expect(mockGetAccessibilityMapFromAddress).toHaveBeenCalledWith(address);
            expect(mockGetRoutingFromAddressToDestination).not.toHaveBeenCalled();
        });

        it('should handle multiple features in accessibility map with destinations', async () => {
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

            // Set the destinations in the interview response with 1 destination
            testInterview.response.destinations = {
                'destination-1': mockDestination1
            };
            mockGetAccessibilityMapFromAddress.mockResolvedValueOnce(multiFeatureMap);
            mockGetRoutingFromAddressToDestination.mockResolvedValueOnce(mockRoutingResult1);

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(result.accessibilityMap).toEqual(multiFeatureMap);
            expect(result.accessibilityMap?.features).toHaveLength(2);
            expect(result.routingTimeDistances).toEqual({
                'destination-1': mockRoutingResult1
            });
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

            expect(result.accessibilityMap).toEqual(mockAccessibilityMap);
            expect(result.routingTimeDistances).toEqual({
                'destination-1': mockRoutingResult1
            });
            expect(mockGetRoutingFromAddressToDestination).toHaveBeenCalledTimes(1);
            expect(mockGetRoutingFromAddressToDestination).toHaveBeenCalledWith(address, mockDestination1);
        });
    });

    describe('error handling', () => {
        it('should return null accessibility map and empty routing when getAccessibilityMapFromAddress returns null', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1'
                // No geography
            };

            mockGetAccessibilityMapFromAddress.mockResolvedValueOnce(null);

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(result.accessibilityMap).toBeNull();
            expect(result.routingTimeDistances).toEqual({});
            expect(mockGetAccessibilityMapFromAddress).toHaveBeenCalledWith(address);
        });

        it('should handle promise rejection from getAccessibilityMapFromAddress', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            mockGetAccessibilityMapFromAddress.mockRejectedValueOnce(new Error('Service error'));

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
            expect(result.accessibilityMap).toEqual(mockAccessibilityMap);
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
                rent: 1200,
                areUtilitiesIncluded: true,
                geography: mockGeography
            };

            // Set the destinations in the interview response with 1 destination
            testInterview.response.destinations = {
                'destination-1': mockDestination1
            };
            mockGetRoutingFromAddressToDestination.mockResolvedValueOnce(mockRoutingResult1);

            const result = await calculateAccessibilityAndRouting(address, testInterview);

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

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(result.accessibilityMap).toEqual(mockAccessibilityMap);
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
                amortizationPeriod: '25',
                geography: mockGeography
            };

            // Set the destinations in the interview response with 1 destination
            testInterview.response.destinations = {
                'destination-2': mockDestination2
            };
            mockGetRoutingFromAddressToDestination.mockResolvedValueOnce(mockRoutingResult2);

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(result.accessibilityMap).toEqual(mockAccessibilityMap);
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

            expect(result.accessibilityMap).toEqual(mockAccessibilityMap);
            expect(result.routingTimeDistances).toEqual({});
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

            // Set the destinations in the interview response with no destination
            testInterview.response.destinations = {};
            mockGetAccessibilityMapFromAddress.mockResolvedValueOnce(emptyMap);

            const result = await calculateAccessibilityAndRouting(address, testInterview);

            expect(result.accessibilityMap).toEqual(emptyMap);
            expect(result.accessibilityMap?.features).toHaveLength(0);
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

            mockGetAccessibilityMapFromAddress.mockImplementation(
                () =>
                    new Promise((resolve) => {
                        setTimeout(() => {
                            accessibilityResolved = true;
                            resolve(mockAccessibilityMap);
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
            expect(result.accessibilityMap).toEqual(mockAccessibilityMap);
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
