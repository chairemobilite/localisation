/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import serverFieldUpdate from '../serverFieldUpdate';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { Address, AddressAccessibilityMapsDurations } from '../../common/types';
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
    const registerUpdateOperationMock = jest.fn();

    const mockAccessibilityMap: AddressAccessibilityMapsDurations = {
        duration15Minutes: null,
        duration30Minutes: {
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
            properties: { durationSeconds: 30 * 60, areaSqM: 4000000 }
        },
        duration45Minutes: null
    };
    const mockAccessibilityMapsByModeResult = {
        transit: mockAccessibilityMap,
        walking: mockAccessibilityMap,
        cycling: mockAccessibilityMap,
        driving: mockAccessibilityMap
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
            accessibilityMapsByMode: mockAccessibilityMapsByModeResult,
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
                areUtilitiesIncluded: true,
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-73.5674, 45.5019]
                    },
                    properties: {}
                }
            };

            mockCalculateMonthlyCost.mockResolvedValue({
                housingCostMonthly: 1200,
                housingAndTransportCostPercentageOfIncome: null,
                carCostMonthly: 350,
                totalCostMonthly: 1550
            });

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value, 'path', registerUpdateOperationMock) as any;

            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect(result['addresses.address-1.monthlyCost']).toEqual({
                housingCostMonthly: 1200,
                housingAndTransportCostPercentageOfIncome: null,
                carCostMonthly: 350,
                totalCostMonthly: 1550
            });
            expect('addresses.address-1.accessibilityMapsByMode' in result).toBe(true);
            expect(result['addresses.address-1.accessibilityMapsByMode']).toEqual('calculating');
            expect(mockCalculateMonthlyCost).toHaveBeenCalledWith(address, interview);
            expect(registerUpdateOperationMock).toHaveBeenCalledWith({
                opName: `addressCalculations${address._uuid}`,
                opUniqueId: 1,
                operation: expect.any(Function)
            });

            // Get the the 'operation' part of the argument passed to the registered operation and execute it to check if it returns the expected accessibility and routing results
            const registeredOperation = registerUpdateOperationMock.mock.calls[0][0].operation;
            const accessibilityAndRoutingResult = await registeredOperation(() => false);
            expect(accessibilityAndRoutingResult['addresses.address-1.accessibilityMapsByMode']).toEqual(mockAccessibilityMapsByModeResult);
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
                utilitiesMonthly: 200,
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-73.5674, 45.5019]
                    },
                    properties: {}
                }
            };

            mockCalculateMonthlyCost.mockResolvedValue({
                housingCostMonthly: 2244.81,
                housingAndTransportCostPercentageOfIncome: null,
                carCostMonthly: 450,
                totalCostMonthly: 2694.81
            });

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value, 'path', registerUpdateOperationMock) as any;

            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBeGreaterThan(2200);
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBeLessThan(2300);
            expect(result['addresses.address-1.monthlyCost'].housingAndTransportCostPercentageOfIncome).toBeNull();
            expect(result['addresses.address-1.monthlyCost'].carCostMonthly).toBe(450);
            expect('addresses.address-1.accessibilityMapsByMode' in result).toBe(true);
            expect(result['addresses.address-1.accessibilityMapsByMode']).toEqual('calculating');
            expect(result['addresses.address-1.routingTimeDistances']).toEqual('calculating');

            // Validate register update callback call
            expect(registerUpdateOperationMock).toHaveBeenCalledWith({
                opName: `addressCalculations${address._uuid}`,
                opUniqueId: 1,
                operation: expect.any(Function)
            });

            // Get the the 'operation' part of the argument passed to the registered operation and execute it to check if it returns the expected accessibility and routing results
            const registeredOperation = registerUpdateOperationMock.mock.calls[0][0].operation;
            const accessibilityAndRoutingResult = await registeredOperation(() => false);
            expect(accessibilityAndRoutingResult['addresses.address-1.accessibilityMapsByMode']).toEqual(mockAccessibilityMapsByModeResult);
            expect(accessibilityAndRoutingResult['addresses.address-1.routingTimeDistances']).toEqual(mockRoutingTimeDistances);
            expect(mockCalculateAccessibilityAndRouting).toHaveBeenCalledWith(address, interview);
        });

        it('should calculate monthly cost and accessibility maps for multiple addresses when navigating to results section', async () => {
            const address1: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true,
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-73.5674, 45.5019]
                    },
                    properties: {}
                }
            };

            const address2: Address = {
                _sequence: 2,
                _uuid: 'address-2',
                ownership: 'rent',
                rentMonthly: 1500,
                areUtilitiesIncluded: false,
                utilitiesMonthly: 150,
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-73.3333, 45.4444]
                    },
                    properties: {}
                }
            };

            mockCalculateMonthlyCost
                .mockResolvedValueOnce({
                    housingCostMonthly: 1200,
                    housingAndTransportCostPercentageOfIncome: null,
                    carCostMonthly: 300,
                    totalCostMonthly: 1500
                })
                .mockResolvedValueOnce({
                    housingCostMonthly: 1650,
                    housingAndTransportCostPercentageOfIncome: null,
                    carCostMonthly: 400,
                    totalCostMonthly: 2050
                });

            const interview = createMockInterview({
                'address-1': address1,
                'address-2': address2
            });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value, 'path', registerUpdateOperationMock) as any;

            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect('addresses.address-2.monthlyCost' in result).toBe(true);
            expect('addresses.address-1.accessibilityMapsByMode' in result).toBe(true);
            expect('addresses.address-2.accessibilityMapsByMode' in result).toBe(true);

            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBe(1200);
            expect(result['addresses.address-1.monthlyCost'].carCostMonthly).toBe(300);
            expect(result['addresses.address-2.monthlyCost'].housingCostMonthly).toBe(1650);
            expect(result['addresses.address-2.monthlyCost'].carCostMonthly).toBe(400);
            expect(result['addresses.address-1.accessibilityMapsByMode']).toEqual('calculating');
            expect(result['addresses.address-2.accessibilityMapsByMode']).toEqual('calculating');
            expect(result['addresses.address-1.routingTimeDistances']).toEqual('calculating');
            expect(result['addresses.address-2.routingTimeDistances']).toEqual('calculating');
            
            expect(mockCalculateMonthlyCost).toHaveBeenCalledTimes(2);

            // Validate register update callback call for both addresses
            expect(registerUpdateOperationMock).toHaveBeenCalledWith({
                opName: `addressCalculations${address1._uuid}`,
                opUniqueId: 1,
                operation: expect.any(Function)
            });
            expect(registerUpdateOperationMock).toHaveBeenCalledWith({
                opName: `addressCalculations${address2._uuid}`,
                opUniqueId: 1,
                operation: expect.any(Function)
            });

            // Get the the 'operation' part of the argument passed to the registered operation and execute it to check if it returns the expected accessibility and routing results
            // For the first address
            const registeredOperation = registerUpdateOperationMock.mock.calls[0][0].operation;
            const accessibilityAndRoutingResult = await registeredOperation(() => false);
            expect(accessibilityAndRoutingResult['addresses.address-1.accessibilityMapsByMode']).toEqual(mockAccessibilityMapsByModeResult);
            expect(accessibilityAndRoutingResult['addresses.address-1.routingTimeDistances']).toEqual(mockRoutingTimeDistances);
            // For the second address
            const registeredOperationAddress2 = registerUpdateOperationMock.mock.calls[1][0].operation;
            const accessibilityAndRoutingResultAddress2 = await registeredOperationAddress2(() => false);
            expect(accessibilityAndRoutingResultAddress2['addresses.address-2.accessibilityMapsByMode']).toEqual(mockAccessibilityMapsByModeResult);
            expect(accessibilityAndRoutingResultAddress2['addresses.address-2.routingTimeDistances']).toEqual(mockRoutingTimeDistances);
            // Validate calls to calculation functions
            expect(mockCalculateAccessibilityAndRouting).toHaveBeenCalledWith(address1, interview);
            expect(mockCalculateAccessibilityAndRouting).toHaveBeenCalledWith(address2, interview);
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
                .mockResolvedValueOnce({
                    housingCostMonthly: 1200,
                    housingAndTransportCostPercentageOfIncome: null,
                    carCostMonthly: 310,
                    totalCostMonthly: 1510
                })
                .mockResolvedValueOnce({
                    housingCostMonthly: null,
                    housingAndTransportCostPercentageOfIncome: null,
                    carCostMonthly: null,
                    totalCostMonthly: null
                });

            mockCalculateAccessibilityAndRouting.mockResolvedValue({
                accessibilityMapsByMode: null,
                routingTimeDistances: null
            });

            const interview = createMockInterview({
                'address-1': address1,
                'address-2': address2
            });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value, 'path', registerUpdateOperationMock) as any;

            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBe(1200);
            expect(result['addresses.address-1.monthlyCost'].carCostMonthly).toBe(310);
            expect(result['addresses.address-2.monthlyCost'].housingCostMonthly).toBeNull();
            expect(result['addresses.address-2.monthlyCost'].carCostMonthly).toBeNull();
            expect('addresses.address-1.accessibilityMapsByMode' in result).toBe(true);
            expect('addresses.address-2.accessibilityMapsByMode' in result).toBe(true);
            expect('addresses.address-1.routingTimeDistances' in result).toBe(true);
            expect('addresses.address-2.routingTimeDistances' in result).toBe(true);
            expect(result['addresses.address-1.accessibilityMapsByMode']).toBeNull();
            expect(result['addresses.address-2.accessibilityMapsByMode']).toBeNull();
            expect(result['addresses.address-1.routingTimeDistances']).toBeNull();
            expect(result['addresses.address-2.routingTimeDistances']).toBeNull();

            // No geography, this function should not have been called and results should be null
            expect(registerUpdateOperationMock).not.toHaveBeenCalled();
        });

        it('should calculate monthly cost and ignore accessibility map and routing if registerUpdateOperation is not set', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriodInYears: '25',
                taxesYearly: 3600,
                utilitiesMonthly: 200,
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-73.5674, 45.5019]
                    },
                    properties: {}
                }
            };

            mockCalculateMonthlyCost.mockResolvedValue({
                housingCostMonthly: 2244.81,
                housingAndTransportCostPercentageOfIncome: null,
                carCostMonthly: 450,
                totalCostMonthly: 2694.81
            });

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'results' }];

            // Calling the callback without the registerUpdateOperation argument to simulate the admin mode case
            const result = await sectionsActionsCallback.callback(interview, value, 'path') as any;

            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBeGreaterThan(2200);
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBeLessThan(2300);
            expect(result['addresses.address-1.monthlyCost'].housingAndTransportCostPercentageOfIncome).toBeNull();
            expect(result['addresses.address-1.monthlyCost'].carCostMonthly).toBe(450);
            expect('addresses.address-1.accessibilityMapsByMode' in result).toBe(true);
            expect(result['addresses.address-1.accessibilityMapsByMode']).toEqual(null);
            expect(result['addresses.address-1.routingTimeDistances']).toEqual(null);

            // Validate register update callback call
            expect(registerUpdateOperationMock).not.toHaveBeenCalled();
        });

        it('should return empty object when no addresses exist', async () => {
            const interview = createMockInterview({});
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value, 'path', registerUpdateOperationMock);

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

            const result = await sectionsActionsCallback.callback(interview, value, 'path', registerUpdateOperationMock);

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

            const result = await sectionsActionsCallback.callback(interview, value, 'path', registerUpdateOperationMock);

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

            const result = await sectionsActionsCallback.callback(interview, value, 'path', registerUpdateOperationMock);

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

            mockCalculateMonthlyCost.mockResolvedValue({
                housingCostMonthly: 1200,
                housingAndTransportCostPercentageOfIncome: null,
                carCostMonthly: 250,
                totalCostMonthly: 1450
            });

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'profile' }, { section: 'addresses' }, { section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value, 'path', registerUpdateOperationMock) as any;

            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBe(1200);
            expect(result['addresses.address-1.monthlyCost'].carCostMonthly).toBe(250);
            expect('addresses.address-1.accessibilityMapsByMode' in result).toBe(true);
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

            const result = await sectionsActionsCallback.callback(interview, value, 'path', registerUpdateOperationMock);

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

            const result = await sectionsActionsCallback.callback(invalidInterview, value, 'path', registerUpdateOperationMock);

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
                .mockResolvedValueOnce({
                    housingCostMonthly: 1200,
                    housingAndTransportCostPercentageOfIncome: null,
                    carCostMonthly: 330,
                    totalCostMonthly: 1530
                })
                .mockResolvedValueOnce({
                    housingCostMonthly: null,
                    housingAndTransportCostPercentageOfIncome: null,
                    carCostMonthly: null,
                    totalCostMonthly: null
                });

            const interview = createMockInterview({
                'address-1': address1,
                'address-2': address2
            });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value, 'path', registerUpdateOperationMock) as any;

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
                .mockResolvedValueOnce({
                    housingCostMonthly: 1200,
                    housingAndTransportCostPercentageOfIncome: null,
                    carCostMonthly: 290,
                    totalCostMonthly: 1490
                })
                .mockResolvedValueOnce({
                    housingCostMonthly: 1100,
                    housingAndTransportCostPercentageOfIncome: null,
                    carCostMonthly: 270,
                    totalCostMonthly: 1370
                });

            // Add them out of order
            const interview = createMockInterview({
                'address-2': address2,
                'address-1': address1
            });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value, 'path', registerUpdateOperationMock) as any;

            // All addresses should be calculated regardless of order
            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect('addresses.address-2.monthlyCost' in result).toBe(true);
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBe(1200);
            expect(result['addresses.address-1.monthlyCost'].carCostMonthly).toBe(290);
            expect(result['addresses.address-1.monthlyCost'].totalCostMonthly).toBe(1490);
            expect(result['addresses.address-2.monthlyCost'].housingCostMonthly).toBe(1100);
            expect(result['addresses.address-2.monthlyCost'].carCostMonthly).toBe(270);
            expect(result['addresses.address-2.monthlyCost'].totalCostMonthly).toBe(1370);
            expect('addresses.address-1.accessibilityMapsByMode' in result).toBe(true);
            expect('addresses.address-2.accessibilityMapsByMode' in result).toBe(true);
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
                areUtilitiesIncluded: true,
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-73.5674, 45.5019]
                    },
                    properties: { }
                }
            };

            mockCalculateMonthlyCost.mockResolvedValue({
                housingCostMonthly: 1200,
                housingAndTransportCostPercentageOfIncome: null,
                carCostMonthly: null,
                totalCostMonthly: null
            });

            mockCalculateAccessibilityAndRouting.mockResolvedValue({
                accessibilityMapsByMode: null,
                routingTimeDistances: null
            });

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value, 'path', registerUpdateOperationMock) as any;

            expect(result['addresses.address-1.accessibilityMapsByMode']).toEqual('calculating');
            expect(result['addresses.address-1.routingTimeDistances']).toEqual('calculating');

            // Validate register update callback call
            expect(registerUpdateOperationMock).toHaveBeenCalledWith({
                opName: `addressCalculations${address._uuid}`,
                opUniqueId: 1,
                operation: expect.any(Function)
            });

            // Get the the 'operation' part of the argument passed to the registered operation and execute it to check if it returns the expected accessibility and routing results
            const registeredOperation = registerUpdateOperationMock.mock.calls[0][0].operation;
            const accessibilityAndRoutingResult = await registeredOperation(() => false);

            expect(accessibilityAndRoutingResult['addresses.address-1.accessibilityMapsByMode']).toEqual(null);
            expect(accessibilityAndRoutingResult['addresses.address-1.routingTimeDistances']).toEqual(null);
        });

        it('should handle accessibility map calculation errors and still return the monthly costs', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rentMonthly: 1200,
                areUtilitiesIncluded: true,
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [-73.5674, 45.5019]
                    },
                    properties: { }
                }
            };

            mockCalculateMonthlyCost.mockResolvedValue({
                housingCostMonthly: 1200,
                housingAndTransportCostPercentageOfIncome: null,
                carCostMonthly: 320,
                totalCostMonthly: 1520
            });

            mockCalculateAccessibilityAndRouting.mockRejectedValue(new Error('Accessibility service error'));

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value, 'path', registerUpdateOperationMock) as any;

            // Should return a partial object with null accessibility map but monthly cost results
            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect(result['addresses.address-1.monthlyCost']).toEqual({
                housingCostMonthly: 1200,
                housingAndTransportCostPercentageOfIncome: null,
                carCostMonthly: 320,
                totalCostMonthly: 1520
            });

            // Validate register update callback call
            expect(registerUpdateOperationMock).toHaveBeenCalledWith({
                opName: `addressCalculations${address._uuid}`,
                opUniqueId: 1,
                operation: expect.any(Function)
            });

            // Get the the 'operation' part of the argument passed to the registered operation and execute it to check if it returns the expected accessibility and routing results
            const registeredOperation = registerUpdateOperationMock.mock.calls[0][0].operation;
            const accessibilityAndRoutingResult = await registeredOperation(() => false);

            expect(accessibilityAndRoutingResult['addresses.address-1.accessibilityMapsByMode']).toEqual(null);
            expect(accessibilityAndRoutingResult['addresses.address-1.routingTimeDistances']).toEqual(null);
        });

    });

});
