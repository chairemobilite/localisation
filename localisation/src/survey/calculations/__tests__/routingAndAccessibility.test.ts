/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { getAccessibilityMapFromAddress, getRoutingFromAddressToDestination } from '../routingAndAccessibility';
import { Address, Destination } from '../../common/types';
import * as routing from 'evolution-backend/lib/services/routing';
import config from 'chaire-lib-common/lib/config/shared/project.config';

// Mock the routing module
jest.mock('evolution-backend/lib/services/routing', () => ({
    getTransitAccessibilityMap: jest.fn(),
    calculateTimeDistanceByMode: jest.fn()
}));

const mockGetTransitAccessibilityMap = routing.getTransitAccessibilityMap as jest.MockedFunction<
    typeof routing.getTransitAccessibilityMap
>;
const mockCalculateTimeDistanceByMode = routing.calculateTimeDistanceByMode as jest.MockedFunction<
    typeof routing.calculateTimeDistanceByMode
>;

describe('getAccessibilityMapFromAddress', () => {
    const mockScenario = 'test-scenario';
    const mockGeography: GeoJSON.Feature<GeoJSON.Point> = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [-73.5, 45.5]
        },
        properties: {}
    };

    const mockPolygons: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> = {
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
        // Set up default config scenario
        config.trRoutingScenarios = {
            SE: mockScenario
        } as any;
    });

    afterEach(() => {
        // Clean up config
        delete config.trRoutingScenarios;
    });

    describe('successful accessibility map calculation', () => {
        it('should return accessibility map for valid address with geography', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            mockGetTransitAccessibilityMap.mockResolvedValue({
                status: 'success',
                polygons: mockPolygons,
                source: 'test'
            });

            const result = await getAccessibilityMapFromAddress(address);

            expect(result).toEqual(mockPolygons);
            expect(mockGetTransitAccessibilityMap).toHaveBeenCalledWith({
                point: mockGeography,
                numberOfPolygons: 1,
                maxTotalTravelTimeMinutes: 30,
                departureSecondsSinceMidnight: 8 * 3600,
                transitScenario: mockScenario,
                calculatePois: true
            });
        });

    });

    describe('error handling - missing geography', () => {
        it('should return null when address has no geography', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1'
                // No geography
            };

            const result = await getAccessibilityMapFromAddress(address);

            expect(result).toBeNull();
            expect(mockGetTransitAccessibilityMap).not.toHaveBeenCalled();
        });

        it('should return null when address geography is undefined', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: undefined
            };

            const result = await getAccessibilityMapFromAddress(address);

            expect(result).toBeNull();
            expect(mockGetTransitAccessibilityMap).not.toHaveBeenCalled();
        });
    });

    describe('error handling - missing scenario configuration', () => {
        it('should return null when no transit scenario is defined in config', async () => {
            delete config.trRoutingScenarios;

            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            const result = await getAccessibilityMapFromAddress(address);

            expect(result).toBeNull();
            expect(mockGetTransitAccessibilityMap).not.toHaveBeenCalled();
        });

        it('should return null when SE scenario is undefined in config', async () => {
            config.trRoutingScenarios = {} as any;

            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            const result = await getAccessibilityMapFromAddress(address);

            expect(result).toBeNull();
            expect(mockGetTransitAccessibilityMap).not.toHaveBeenCalled();
        });
    });

    describe('error handling - accessibility map service errors', () => {
        it('should return null when getTransitAccessibilityMap returns error status', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            mockGetTransitAccessibilityMap.mockResolvedValue({
                status: 'error',
                error: 'Service unavailable',
                source: 'test'
            });

            const result = await getAccessibilityMapFromAddress(address);

            expect(result).toBeNull();
            expect(mockGetTransitAccessibilityMap).toHaveBeenCalled();
        });

        it('should return null and handle exception from getTransitAccessibilityMap', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            mockGetTransitAccessibilityMap.mockRejectedValue(new Error('Network error'));

            const result = await getAccessibilityMapFromAddress(address);

            expect(result).toBeNull();
        });

        it('should return null when service throws unexpected error', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            mockGetTransitAccessibilityMap.mockRejectedValue('Unknown error');

            const result = await getAccessibilityMapFromAddress(address);

            expect(result).toBeNull();
        });
    });

    describe('different polygon results', () => {
        it('should handle empty polygon collection', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            const emptyPolygons: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> = {
                type: 'FeatureCollection',
                features: []
            };

            mockGetTransitAccessibilityMap.mockResolvedValue({
                status: 'success',
                polygons: emptyPolygons,
                source: 'test'
            });

            const result = await getAccessibilityMapFromAddress(address);

            expect(result).toEqual(emptyPolygons);
            expect(result?.features).toHaveLength(0);
        });

        it('should handle multiple polygons in result', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            const multiplePolygons: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> = {
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
                    },
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

            mockGetTransitAccessibilityMap.mockResolvedValue({
                status: 'success',
                polygons: multiplePolygons,
                source: 'test'
            });

            const result = await getAccessibilityMapFromAddress(address);

            expect(result).toEqual(multiplePolygons);
            expect(result?.features).toHaveLength(2);
        });
    });
});

describe('getRoutingFromAddressToDestination', () => {

    const mockScenario = 'test-scenario';
    const mockAddressGeography: GeoJSON.Feature<GeoJSON.Point> = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [-73.5, 45.5]
        },
        properties: {}
    };

    const mockDestinationGeography: GeoJSON.Feature<GeoJSON.Point> = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [-73.6, 45.6]
        },
        properties: {}
    };

    beforeEach(() => {
        jest.clearAllMocks();
        config.trRoutingScenarios = {
            SE: mockScenario
        } as any;
    });

    afterEach(() => {
        delete config.trRoutingScenarios;
    });

    describe('successful routing calculation', () => {
        it('should return routing results for all modes when all succeed', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockAddressGeography
            };

            const destination: Destination = {
                _sequence: 1,
                _uuid: 'destination-1',
                geography: mockDestinationGeography
            };

            mockCalculateTimeDistanceByMode.mockResolvedValue({
                walking: {
                    status: 'success',
                    distanceM: 1000,
                    travelTimeS: 720,
                    source: 'test'
                },
                cycling: {
                    status: 'success',
                    distanceM: 1200,
                    travelTimeS: 240,
                    source: 'test'
                },
                driving: {
                    status: 'success',
                    distanceM: 1500,
                    travelTimeS: 180,
                    source: 'test'
                },
                transit: {
                    status: 'success',
                    distanceM: 1300,
                    travelTimeS: 600,
                    source: 'test'
                }
            });

            const result = await getRoutingFromAddressToDestination(address, destination);

            expect(result).not.toBeNull();
            expect(result?._uuid).toBe('destination-1');
            expect(result?._sequence).toBe(1);
            expect(result?.resultsByMode.transit).toEqual({
                _uuid: 'transit',
                _sequence: 0,
                distanceMeters: 1300,
                travelTimeSeconds: 600
            });
            expect(result?.resultsByMode.walking).toEqual({
                _uuid: 'walking',
                _sequence: 1,
                distanceMeters: 1000,
                travelTimeSeconds: 720
            });
            expect(result?.resultsByMode.cycling).toEqual({
                _uuid: 'cycling',
                _sequence: 2,
                distanceMeters: 1200,
                travelTimeSeconds: 240
            });
            expect(result?.resultsByMode.driving).toEqual({
                _uuid: 'driving',
                _sequence: 3,
                distanceMeters: 1500,
                travelTimeSeconds: 180
            });
            expect(mockCalculateTimeDistanceByMode).toHaveBeenCalledWith(['transit', 'walking', 'cycling', 'driving'], {
                origin: mockAddressGeography,
                destination: mockDestinationGeography,
                departureSecondsSinceMidnight: 28800, // 8 AM
                transitScenario: mockScenario,
                departureDateString: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)
            });
        });
    });

    describe('partial routing results', () => {
        it('should handle when some modes fail', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockAddressGeography
            };

            const destination: Destination = {
                _sequence: 1,
                _uuid: 'destination-1',
                geography: mockDestinationGeography
            };

            mockCalculateTimeDistanceByMode.mockResolvedValue({
                walking: {
                    status: 'success',
                    distanceM: 1000,
                    travelTimeS: 720,
                    source: 'test'
                },
                cycling: {
                    status: 'no_routing_found',
                    source: 'test'
                },
                driving: {
                    status: 'error',
                    error: 'No route found',
                    source: 'test'
                },
                transit: {
                    status: 'success',
                    distanceM: 1300,
                    travelTimeS: 600,
                    source: 'test'
                }
            });

            const result = await getRoutingFromAddressToDestination(address, destination);

            expect(result).not.toBeNull();
            expect(result?.resultsByMode.walking).not.toBeNull();
            expect(result?.resultsByMode.cycling).toBeNull();
            expect(result?.resultsByMode.driving).toBeNull();
            expect(result?.resultsByMode.transit).not.toBeNull();
        });

        it('should handle when all modes fail', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockAddressGeography
            };

            const destination: Destination = {
                _sequence: 1,
                _uuid: 'destination-1',
                geography: mockDestinationGeography
            };

            mockCalculateTimeDistanceByMode.mockResolvedValue({
                walking: { status: 'no_routing_found', source: 'test' },
                cycling: { status: 'no_routing_found', source: 'test' },
                driving: { status: 'no_routing_found', source: 'test' },
                transit: { status: 'error', error: 'Service unavailable', source: 'test' }
            });

            const result = await getRoutingFromAddressToDestination(address, destination);

            expect(result).not.toBeNull();
            expect(result?.resultsByMode.walking).toBeNull();
            expect(result?.resultsByMode.cycling).toBeNull();
            expect(result?.resultsByMode.driving).toBeNull();
            expect(result?.resultsByMode.transit).toBeNull();
        });
    });

    describe('error handling - missing geography', () => {
        it('should return null when address has no geography', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1'
                // No geography
            };

            const destination: Destination = {
                _sequence: 1,
                _uuid: 'destination-1',
                geography: mockDestinationGeography
            };

            const result = await getRoutingFromAddressToDestination(address, destination);

            expect(result).toBeNull();
            expect(mockCalculateTimeDistanceByMode).not.toHaveBeenCalled();
        });

        it('should return null when address geography is undefined', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: undefined
            };

            const destination: Destination = {
                _sequence: 1,
                _uuid: 'destination-1',
                geography: mockDestinationGeography
            };

            const result = await getRoutingFromAddressToDestination(address, destination);

            expect(result).toBeNull();
            expect(mockCalculateTimeDistanceByMode).not.toHaveBeenCalled();
        });

        it('should return null when destination has no geography', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockAddressGeography
            };

            const destination: Destination = {
                _sequence: 1,
                _uuid: 'destination-1'
                // No geography
            };

            const result = await getRoutingFromAddressToDestination(address, destination);

            expect(result).toBeNull();
            expect(mockCalculateTimeDistanceByMode).not.toHaveBeenCalled();
        });

        it('should return null when destination geography is undefined', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockAddressGeography
            };

            const destination: Destination = {
                _sequence: 1,
                _uuid: 'destination-1',
                geography: undefined
            };

            const result = await getRoutingFromAddressToDestination(address, destination);

            expect(result).toBeNull();
            expect(mockCalculateTimeDistanceByMode).not.toHaveBeenCalled();
        });
    });

    describe('error handling - missing scenario configuration', () => {
        it('should return null when no transit scenario is defined in config', async () => {
            delete config.trRoutingScenarios;

            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockAddressGeography
            };

            const destination: Destination = {
                _sequence: 1,
                _uuid: 'destination-1',
                geography: mockDestinationGeography
            };

            const result = await getRoutingFromAddressToDestination(address, destination);

            expect(result).toBeNull();
            expect(mockCalculateTimeDistanceByMode).not.toHaveBeenCalled();
        });

        it('should return null when SE scenario is undefined in config', async () => {
            config.trRoutingScenarios = {} as any;

            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockAddressGeography
            };

            const destination: Destination = {
                _sequence: 1,
                _uuid: 'destination-1',
                geography: mockDestinationGeography
            };

            const result = await getRoutingFromAddressToDestination(address, destination);

            expect(result).toBeNull();
            expect(mockCalculateTimeDistanceByMode).not.toHaveBeenCalled();
        });
    });

    describe('error handling - service errors', () => {
        it('should return null when calculateTimeDistanceByMode throws error', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockAddressGeography
            };

            const destination: Destination = {
                _sequence: 1,
                _uuid: 'destination-1',
                geography: mockDestinationGeography
            };

            mockCalculateTimeDistanceByMode.mockRejectedValue(new Error('Network error'));

            const result = await getRoutingFromAddressToDestination(address, destination);

            expect(result).toBeNull();
        });

        it('should return null when service throws unexpected error', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockAddressGeography
            };

            const destination: Destination = {
                _sequence: 1,
                _uuid: 'destination-1',
                geography: mockDestinationGeography
            };

            mockCalculateTimeDistanceByMode.mockRejectedValue('Unknown error');

            const result = await getRoutingFromAddressToDestination(address, destination);

            expect(result).toBeNull();
        });
    });

    describe('destination metadata preservation', () => {
        it('should preserve destination uuid and sequence in result', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockAddressGeography
            };

            const destination: Destination = {
                _sequence: 5,
                _uuid: 'destination-xyz',
                name: 'Work',
                geography: mockDestinationGeography
            };

            mockCalculateTimeDistanceByMode.mockResolvedValue({
                walking: { status: 'success', distanceM: 1000, travelTimeS: 720, source: 'test' },
                cycling: { status: 'success', distanceM: 1200, travelTimeS: 240, source: 'test' },
                driving: { status: 'success', distanceM: 1500, travelTimeS: 180, source: 'test' },
                transit: { status: 'success', distanceM: 1300, travelTimeS: 600, source: 'test' }
            });

            const result = await getRoutingFromAddressToDestination(address, destination);

            expect(result?._uuid).toBe('destination-xyz');
            expect(result?._sequence).toBe(5);
        });

        it('should assign correct sequence numbers to modes', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockAddressGeography
            };

            const destination: Destination = {
                _sequence: 1,
                _uuid: 'destination-1',
                geography: mockDestinationGeography
            };

            mockCalculateTimeDistanceByMode.mockResolvedValue({
                walking: { status: 'success', distanceM: 1000, travelTimeS: 720, source: 'test' },
                cycling: { status: 'success', distanceM: 1200, travelTimeS: 240, source: 'test' },
                driving: { status: 'success', distanceM: 1500, travelTimeS: 180, source: 'test' },
                transit: { status: 'success', distanceM: 1300, travelTimeS: 600, source: 'test' }
            });

            const result = await getRoutingFromAddressToDestination(address, destination);

            // Mode sequences should match the order in calculationModes array
            expect(result?.resultsByMode.transit?._sequence).toBe(0);
            expect(result?.resultsByMode.walking?._sequence).toBe(1);
            expect(result?.resultsByMode.cycling?._sequence).toBe(2);
            expect(result?.resultsByMode.driving?._sequence).toBe(3);
        });
    });
});
