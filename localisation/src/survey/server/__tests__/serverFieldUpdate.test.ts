/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import serverFieldUpdate from '../serverFieldUpdate';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { Address } from '../../common/types';
import * as calculations from '../../calculations';

// Mock the calculations module
jest.mock('../../calculations', () => ({
    calculateMonthlyCost: jest.fn(),
    calculateAccessibilityAndRouting: jest.fn()
}));

const mockCalculateMonthlyCost = calculations.calculateMonthlyCost as jest.MockedFunction<
    typeof calculations.calculateMonthlyCost
>;
const mockCalculateAccessibilityAndRouting = calculations.calculateAccessibilityAndRouting as jest.MockedFunction<
    typeof calculations.calculateAccessibilityAndRouting
>;

describe('serverFieldUpdate - _sections._actions callback', () => {
    const sectionsActionsCallback = serverFieldUpdate.find(callback => callback.field === '_sections._actions')!;

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
    const mockRoutingTimeDistances = {
        'destination-uuid-1': {
            _uuid: 'destination-uuid-1',
            _sequence: 1,
            resultsByMode: {
                walking: {
                    _uuid: 'walking',
                    _sequence: 1,
                    distanceMeters: 1000,
                    travelTimeSeconds: 720
                },
                cycling: {
                    _uuid: 'cycling',
                    _sequence: 2,
                    distanceMeters: 1200,
                    travelTimeSeconds: 240
                },
                driving: {
                    _uuid: 'driving',
                    _sequence: 3,
                    distanceMeters: 1500,
                    travelTimeSeconds: 180
                },
                transit: {
                    _uuid: 'transit',
                    _sequence: 0,
                    distanceMeters: 1300,
                    travelTimeSeconds: 600
                }
            }
        },
        'destination-uuid-2': {
            _uuid: 'destination-uuid-2',
            _sequence: 2,
            resultsByMode: {
                walking: {
                    _uuid: 'walking',
                    _sequence: 1,
                    distanceMeters: 1000,
                    travelTimeSeconds: 720
                },
                cycling: {
                    _uuid: 'cycling',
                    _sequence: 2,
                    distanceMeters: 1200,
                    travelTimeSeconds: 240
                },
                driving: {
                    _uuid: 'driving',
                    _sequence: 3,
                    distanceMeters: 1500,
                    travelTimeSeconds: 180
                },
                transit: {
                    _uuid: 'transit',
                    _sequence: 0,
                    distanceMeters: 1300,
                    travelTimeSeconds: 600
                }
            }
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Set up default mock return values
        mockCalculateAccessibilityAndRouting.mockResolvedValue({
            accessibilityMap: mockAccessibilityMap,
            routingTimeDistances: mockRoutingTimeDistances
        });
    });

    const createMockInterview = (addresses: { [uuid: string]: Address } = {}): UserInterviewAttributes => ({
        id: 1,
        uuid: 'interview-uuid',
        participant_id: 1,
        is_completed: false,
        response: {
            addresses
        } as any,
        validations: {},
        is_valid: true
    });

    describe('callback metadata', () => {
        it('should have correct field configuration', () => {
            expect(sectionsActionsCallback.field).toBe('_sections._actions');
            expect(sectionsActionsCallback.runOnValidatedData).toBe(false);
        });
    });

    describe('callback execution - results section', () => {
        it('should calculate monthly cost and accessibility map for single rent address when navigating to results section', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            mockCalculateMonthlyCost.mockReturnValue({
                housingCostMonthly: 1200,
                housingCostPercentageOfIncome: null,
                carCostMonthly: 350,
                totalCostMonthly: 1550
            });

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect(result['addresses.address-1.monthlyCost']).toEqual({
                housingCostMonthly: 1200,
                housingCostPercentageOfIncome: null,
                carCostMonthly: 350,
                totalCostMonthly: 1550
            });
            expect('addresses.address-1.accessibilityMap' in result).toBe(true);
            expect(result['addresses.address-1.accessibilityMap']).toEqual(mockAccessibilityMap);
            expect(mockCalculateMonthlyCost).toHaveBeenCalledWith(address, interview);
            expect(mockCalculateAccessibilityAndRouting).toHaveBeenCalledWith(address, interview);
        });

        it('should calculate monthly cost and accessibility map for single mortgage address when navigating to results section', async () => {
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

            mockCalculateMonthlyCost.mockReturnValue({
                housingCostMonthly: 2244.81,
                housingCostPercentageOfIncome: null,
                carCostMonthly: 450,
                totalCostMonthly: 2694.81
            });

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBeGreaterThan(2200);
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBeLessThan(2300);
            expect(result['addresses.address-1.monthlyCost'].housingCostPercentageOfIncome).toBeNull();
            expect(result['addresses.address-1.monthlyCost'].carCostMonthly).toBe(450);
            expect('addresses.address-1.accessibilityMap' in result).toBe(true);
            expect(result['addresses.address-1.accessibilityMap']).toEqual(mockAccessibilityMap);
            expect(result['addresses.address-1.routingTimeDistances']).toEqual(mockRoutingTimeDistances);
        });

        it('should calculate monthly cost and accessibility maps for multiple addresses when navigating to results section', async () => {
            const address1: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const address2: Address = {
                _sequence: 2,
                _uuid: 'address-2',
                ownership: 'rent',
                rentMonthly: 1500,
                areUtilitiesIncluded: false,
                utilitiesMonthly: 150
            };

            mockCalculateMonthlyCost
                .mockReturnValueOnce({
                    housingCostMonthly: 1200,
                    housingCostPercentageOfIncome: null,
                    carCostMonthly: 300,
                    totalCostMonthly: 1500
                })
                .mockReturnValueOnce({
                    housingCostMonthly: 1650,
                    housingCostPercentageOfIncome: null,
                    carCostMonthly: 400,
                    totalCostMonthly: 2050
                });

            const interview = createMockInterview({
                'address-1': address1,
                'address-2': address2
            });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect('addresses.address-2.monthlyCost' in result).toBe(true);
            expect('addresses.address-1.accessibilityMap' in result).toBe(true);
            expect('addresses.address-2.accessibilityMap' in result).toBe(true);

            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBe(1200);
            expect(result['addresses.address-1.monthlyCost'].carCostMonthly).toBe(300);
            expect(result['addresses.address-2.monthlyCost'].housingCostMonthly).toBe(1650);
            expect(result['addresses.address-2.monthlyCost'].carCostMonthly).toBe(400);
            expect(result['addresses.address-1.accessibilityMap']).toEqual(mockAccessibilityMap);
            expect(result['addresses.address-2.accessibilityMap']).toEqual(mockAccessibilityMap);
            expect(result['addresses.address-1.routingTimeDistances']).toEqual(mockRoutingTimeDistances);
            expect(result['addresses.address-2.routingTimeDistances']).toEqual(mockRoutingTimeDistances);
            
            expect(mockCalculateMonthlyCost).toHaveBeenCalledTimes(2);
            expect(mockCalculateAccessibilityAndRouting).toHaveBeenCalledTimes(2);
        });

        it('should handle addresses with incomplete data gracefully', async () => {
            const address1: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const address2: Address = {
                _sequence: 2,
                _uuid: 'address-2',
                ownership: 'rent'
                // Missing rent data
            };

            mockCalculateMonthlyCost
                .mockReturnValueOnce({
                    housingCostMonthly: 1200,
                    housingCostPercentageOfIncome: null,
                    carCostMonthly: 310,
                    totalCostMonthly: 1510
                })
                .mockReturnValueOnce({
                    housingCostMonthly: null,
                    housingCostPercentageOfIncome: null,
                    carCostMonthly: null,
                    totalCostMonthly: null
                });

            mockCalculateAccessibilityAndRouting.mockResolvedValue({
                accessibilityMap: null,
                routingTimeDistances: null
            });

            const interview = createMockInterview({
                'address-1': address1,
                'address-2': address2
            });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBe(1200);
            expect(result['addresses.address-1.monthlyCost'].carCostMonthly).toBe(310);
            expect(result['addresses.address-2.monthlyCost'].housingCostMonthly).toBeNull();
            expect(result['addresses.address-2.monthlyCost'].carCostMonthly).toBeNull();
            expect('addresses.address-1.accessibilityMap' in result).toBe(true);
            expect('addresses.address-2.accessibilityMap' in result).toBe(true);
            expect('addresses.address-1.routingTimeDistances' in result).toBe(true);
            expect('addresses.address-2.routingTimeDistances' in result).toBe(true);
        });

        it('should return empty object when no addresses exist', async () => {
            const interview = createMockInterview({});
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value);

            expect(result).toEqual({});
        });
    });

    describe('callback execution - non-results sections', () => {
        it('should return empty object when navigating to a non-results section', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'profile' }];

            const result = await sectionsActionsCallback.callback(interview, value);

            expect(result).toEqual({});
        });

        it('should return empty object when value is not an array', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const interview = createMockInterview({ 'address-1': address });
            const value = { section: 'results' };

            const result = await sectionsActionsCallback.callback(interview, value);

            expect(result).toEqual({});
        });

        it('should return empty object when value is an empty array', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const interview = createMockInterview({ 'address-1': address });
            const value: any[] = [];

            const result = await sectionsActionsCallback.callback(interview, value);

            expect(result).toEqual({});
        });

        it('should check the last element in the array for results section', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            mockCalculateMonthlyCost.mockReturnValue({
                housingCostMonthly: 1200,
                housingCostPercentageOfIncome: null,
                carCostMonthly: 250,
                totalCostMonthly: 1450
            });

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'profile' }, { section: 'addresses' }, { section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBe(1200);
            expect(result['addresses.address-1.monthlyCost'].carCostMonthly).toBe(250);
            expect('addresses.address-1.accessibilityMap' in result).toBe(true);
        });

        it('should not calculate if last element is not results section', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'results' }, { section: 'profile' }];

            const result = await sectionsActionsCallback.callback(interview, value);

            expect(result).toEqual({});
        });
    });

    describe('error handling', () => {
        it('should handle errors gracefully and return empty object', async () => {
            // Create an interview that will cause an error in getAddressesArray
            const invalidInterview = {
                id: 1,
                uuid: 'interview-uuid',
                participant_id: 1,
                is_completed: false,
                response: null, // This will cause an error
                validations: {},
                is_valid: true
            } as any;

            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(invalidInterview, value);

            expect(result).toEqual({});
        });

        it('should handle calculation errors for individual addresses', async () => {
            const address1: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            // Invalid address that might cause calculation issues
            const address2: Address = {
                _sequence: 2,
                _uuid: 'address-2',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriodInYears: 'invalid' as any
            };

            mockCalculateMonthlyCost
                .mockReturnValueOnce({
                    housingCostMonthly: 1200,
                    housingCostPercentageOfIncome: null,
                    carCostMonthly: 330,
                    totalCostMonthly: 1530
                })
                .mockReturnValueOnce({
                    housingCostMonthly: null,
                    housingCostPercentageOfIncome: null,
                    carCostMonthly: null,
                    totalCostMonthly: null
                });

            const interview = createMockInterview({
                'address-1': address1,
                'address-2': address2
            });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            // Should still process valid address
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBe(1200);
            expect(result['addresses.address-1.monthlyCost'].carCostMonthly).toBe(330);
            // Invalid address should have null
            expect(result['addresses.address-2.monthlyCost'].housingCostMonthly).toBeNull();
            expect(result['addresses.address-2.monthlyCost'].carCostMonthly).toBeNull();
        });
    });

    describe('address ordering', () => {
        it('should process addresses in sequence order', async () => {
            const address2: Address = {
                _sequence: 2,
                _uuid: 'address-2',
                ownership: 'rent',
                rentMonthly: 1100,
                areUtilitiesIncluded: true
            };

            const address1: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            mockCalculateMonthlyCost
                .mockReturnValueOnce({
                    housingCostMonthly: 1200,
                    housingCostPercentageOfIncome: null,
                    carCostMonthly: 290,
                    totalCostMonthly: 1490
                })
                .mockReturnValueOnce({
                    housingCostMonthly: 1100,
                    housingCostPercentageOfIncome: null,
                    carCostMonthly: 270,
                    totalCostMonthly: 1370
                });

            // Add them out of order
            const interview = createMockInterview({
                'address-2': address2,
                'address-1': address1
            });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            // All addresses should be calculated regardless of order
            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect('addresses.address-2.monthlyCost' in result).toBe(true);
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBe(1200);
            expect(result['addresses.address-1.monthlyCost'].carCostMonthly).toBe(290);
            expect(result['addresses.address-1.monthlyCost'].totalCostMonthly).toBe(1490);
            expect(result['addresses.address-2.monthlyCost'].housingCostMonthly).toBe(1100);
            expect(result['addresses.address-2.monthlyCost'].carCostMonthly).toBe(270);
            expect(result['addresses.address-2.monthlyCost'].totalCostMonthly).toBe(1370);
            expect('addresses.address-1.accessibilityMap' in result).toBe(true);
            expect('addresses.address-2.accessibilityMap' in result).toBe(true);
            expect('addresses.address-1.routingTimeDistances' in result).toBe(true);
            expect('addresses.address-2.routingTimeDistances' in result).toBe(true);
        });
    });

    describe('accessibility map handling', () => {
        it('should include accessibility map even when it returns null', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            mockCalculateMonthlyCost.mockReturnValue({
                housingCostMonthly: 1200,
                housingCostPercentageOfIncome: null,
                carCostMonthly: null,
                totalCostMonthly: null
            });

            mockCalculateAccessibilityAndRouting.mockResolvedValue({
                accessibilityMap: null,
                routingTimeDistances: null
            });

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            expect('addresses.address-1.accessibilityMap' in result).toBe(true);
            expect(result['addresses.address-1.accessibilityMap']).toBeNull();
            expect('addresses.address-1.routingTimeDistances' in result).toBe(true);
            expect(result['addresses.address-1.routingTimeDistances']).toBeNull();
        });

        it('should handle accessibility map calculation errors and still return the monthly costs', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            mockCalculateMonthlyCost.mockReturnValue({
                housingCostMonthly: 1200,
                housingCostPercentageOfIncome: null,
                carCostMonthly: 320,
                totalCostMonthly: 1520
            });

            mockCalculateAccessibilityAndRouting.mockRejectedValue(new Error('Accessibility service error'));

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            // Should return a partial object with null accessibility map but monthly cost results
            expect('addresses.address-1.accessibilityMap' in result).toBe(true);
            expect(result['addresses.address-1.accessibilityMap']).toBeNull();
            expect('addresses.address-1.routingTimeDistances' in result).toBe(true);
            expect(result['addresses.address-1.routingTimeDistances']).toBeNull();
            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect(result['addresses.address-1.monthlyCost']).toEqual({
                housingCostMonthly: 1200,
                housingCostPercentageOfIncome: null,
                carCostMonthly: 320,
                totalCostMonthly: 1520
            });
        });

        it('should call calculateAccessibilityAndRouting for each address', async () => {
            const address1: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true
            };

            const address2: Address = {
                _sequence: 2,
                _uuid: 'address-2',
                ownership: 'rent',
                rentMonthly: 1500,
                areUtilitiesIncluded: true
            };

            mockCalculateMonthlyCost.mockReturnValue({
                housingCostMonthly: 1200,
                housingCostPercentageOfIncome: null,
                carCostMonthly: 280,
                totalCostMonthly: 1480
            });

            const interview = createMockInterview({
                'address-1': address1,
                'address-2': address2
            });
            const value = [{ section: 'results' }];

            await sectionsActionsCallback.callback(interview, value);

            expect(mockCalculateAccessibilityAndRouting).toHaveBeenCalledTimes(2);
            expect(mockCalculateAccessibilityAndRouting).toHaveBeenCalledWith(address1, interview);
            expect(mockCalculateAccessibilityAndRouting).toHaveBeenCalledWith(address2, interview);
        });
    });
});
