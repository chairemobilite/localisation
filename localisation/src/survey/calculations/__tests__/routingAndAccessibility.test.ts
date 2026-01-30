/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { getAccessibilityMapFromAddressForSimpleModes, getAccessibilityMapFromAddressForTransit, getRoutingFromAddressToDestination } from '../routingAndAccessibility';
import type { Address, Destination } from '../../common/types';
import * as routing from 'evolution-backend/lib/services/routing';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import _ from 'lodash';
import type { AccessibilityMapPolygonProperties } from 'evolution-backend/lib/services/routing/types';

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

// Mock polygons for testing: with durations of 15, 30 and 45 minutes 
const mockPolygons: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon, AccessibilityMapPolygonProperties> = {
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
            properties: {
                durationSeconds: 15 * 60,
                areaSqM: 1000000
            }
        }, {
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
                areaSqM: 1000000
            }
        }, {
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
                areaSqM: 1000000
            }
        }
    ]
};

describe('getAccessibilityMapFromAddressForTransit', () => {
    const mockScenario = 'test-scenario';
    const mockGeography: GeoJSON.Feature<GeoJSON.Point> = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [-73.5, 45.5]
        },
        properties: {}
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

            const result = await getAccessibilityMapFromAddressForTransit(address);

            expect(result).toEqual({
                duration15Minutes: mockPolygons.features[0],
                duration30Minutes: mockPolygons.features[1],
                duration45Minutes: mockPolygons.features[2]
            });
            expect(mockGetTransitAccessibilityMap).toHaveBeenCalledWith({
                point: mockGeography,
                numberOfPolygons: 3,
                maxTotalTravelTimeMinutes: 45,
                departureSecondsSinceMidnight: 8 * 3600,
                transitScenario: mockScenario,
                calculatePois: true
            });
        });

    });

    test.each([
        [{ description: 'address has no geography', address: { _sequence: 1, _uuid: 'address-1' as string } }],
        [{ description: 'address geography is undefined', address: { _sequence: 1, _uuid: 'address-1', geography: undefined } }]
    ])('error handling - $description', async ({ address }: { address: Address }) => {
        const result = await getAccessibilityMapFromAddressForTransit(address);

        expect(result).toBeNull();
        expect(mockGetTransitAccessibilityMap).not.toHaveBeenCalled();
    });

    test.each([
        {
            description: 'no transit scenario is defined in config',
            setupConfig: () => { delete config.trRoutingScenarios; }
        },
        {
            description: 'SE scenario is undefined in config',
            setupConfig: () => { config.trRoutingScenarios = {} as any; }
        }
    ])('error handling - missing scenario configuration - should return null when $description', async ({ setupConfig }) => {
        setupConfig();

        const address: Address = {
            _sequence: 1,
            _uuid: 'address-1',
            geography: mockGeography
        };

        const result = await getAccessibilityMapFromAddressForTransit(address);

        expect(result).toBeNull();
        expect(mockGetTransitAccessibilityMap).not.toHaveBeenCalled();
    });

    test.each([
        {
            description: 'getTransitAccessibilityMap returns error status',
            setupMock: () => {
                mockGetTransitAccessibilityMap.mockResolvedValue({
                    status: 'error',
                    error: 'Service unavailable',
                    source: 'test'
                });
            }
        },
        {
            description: 'exception from getTransitAccessibilityMap',
            setupMock: () => {
                mockGetTransitAccessibilityMap.mockRejectedValue(new Error('Network error'));
            }
        },
        {
            description: 'service throws unexpected error',
            setupMock: () => {
                mockGetTransitAccessibilityMap.mockRejectedValue('Unknown error');
            }
        }
    ])('error handling - accessibility map service errors - should return null when $description', async ({ setupMock }) => {
        const address: Address = {
            _sequence: 1,
            _uuid: 'address-1',
            geography: mockGeography
        };

        setupMock();

        const result = await getAccessibilityMapFromAddressForTransit(address);

        expect(result).toBeNull();
        expect(mockGetTransitAccessibilityMap).toHaveBeenCalled();
    });

    test.each([
        {
            description: 'empty polygon collection',
            polygonFeatures: [],
            expected: {
                duration15Minutes: null,
                duration30Minutes: null,
                duration45Minutes: null
            }
        },
        {
            description: 'missing polygons in result (no 30 minutes)',
            polygonFeatures: [mockPolygons.features[0], mockPolygons.features[2]],
            expected: {
                duration15Minutes: mockPolygons.features[0],
                duration30Minutes: null,
                duration45Minutes: mockPolygons.features[2]
            }
        }
    ])('different polygon results - should handle $description', async ({ polygonFeatures, expected }) => {
        const address: Address = {
            _sequence: 1,
            _uuid: 'address-1',
            geography: mockGeography
        };

        const polygons: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon, AccessibilityMapPolygonProperties> = {
            type: 'FeatureCollection',
            features: polygonFeatures
        };

        mockGetTransitAccessibilityMap.mockResolvedValue({
            status: 'success',
            polygons: polygons,
            source: 'test'
        });

        const result = await getAccessibilityMapFromAddressForTransit(address);

        expect(result).toEqual(expected);
    });
});

describe('getAccessibilityMapFromAddressForSimpleModes', () => {
    const mockScenario = 'test-scenario';
    const mockGeography: GeoJSON.Feature<GeoJSON.Point> = {
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: [-73.5, 45.5]
        },
        properties: {}
    };

    const mockWalkingPolygons = mockPolygons;
    // durations are multiplied by 3 for cycling;
    const mockCyclingPolygons = {
        type: 'FeatureCollection' as const,
        features: mockPolygons.features.map((feature) => ({
            ...feature,
            properties: {
                ...feature.properties,
                durationSeconds: feature.properties.durationSeconds * 3
            }
        }))
    };
    const mockDrivingPolygons = {
        type: 'FeatureCollection' as const,
        features: mockPolygons.features.map((feature) => ({
            ...feature,
            properties: {
                ...feature.properties,
                durationSeconds: feature.properties.durationSeconds * 8
            }
        }))
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Set up default config empty scenario
        config.emptyScenarioForSimpleModes = mockScenario;
    });

    afterEach(() => {
        // Clean up config
        delete config.emptyScenarioForSimpleModes;
    });

    describe('successful accessibility map calculation', () => {
        it('should return accessibility map for valid address with geography', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                geography: mockGeography
            };

            mockGetTransitAccessibilityMap.mockResolvedValueOnce({
                status: 'success',
                polygons: mockWalkingPolygons,
                source: 'test'
            });
            mockGetTransitAccessibilityMap.mockResolvedValueOnce({
                status: 'success',
                polygons: mockCyclingPolygons,
                source: 'test'
            });
            mockGetTransitAccessibilityMap.mockResolvedValueOnce({
                status: 'success',
                polygons: mockDrivingPolygons,
                source: 'test'
            });

            const result = await getAccessibilityMapFromAddressForSimpleModes(address);

            expect(result).toEqual({
                walking: {
                    duration15Minutes: mockWalkingPolygons.features[0],
                    duration30Minutes: mockWalkingPolygons.features[1],
                    duration45Minutes: mockWalkingPolygons.features[2]
                },
                cycling: {
                    duration15Minutes: mockCyclingPolygons.features[0],
                    duration30Minutes: mockCyclingPolygons.features[1],
                    duration45Minutes: mockCyclingPolygons.features[2]
                },
                driving: {
                    duration15Minutes: mockDrivingPolygons.features[0],
                    duration30Minutes: mockDrivingPolygons.features[1],
                    duration45Minutes: mockDrivingPolygons.features[2]
                }
            });
            // Test call for walking mode
            expect(mockGetTransitAccessibilityMap).toHaveBeenCalledWith({
                point: mockGeography,
                numberOfPolygons: 3,
                maxTotalTravelTimeMinutes: 45,
                maxAccessEgressTravelTimeMinutes: 45,
                departureSecondsSinceMidnight: 8 * 3600,
                transitScenario: mockScenario,
                walkingSpeedKmPerHour: 5,
                calculatePois: true
            });
            // Test call for cycling mode
            expect(mockGetTransitAccessibilityMap).toHaveBeenCalledWith({
                point: mockGeography,
                numberOfPolygons: 3,
                maxTotalTravelTimeMinutes: 45 * 3,
                maxAccessEgressTravelTimeMinutes: 45 * 3,
                departureSecondsSinceMidnight: 8 * 3600,
                transitScenario: mockScenario,
                calculatePois: true
            });
            // Test call for driving mode
            expect(mockGetTransitAccessibilityMap).toHaveBeenCalledWith({
                point: mockGeography,
                numberOfPolygons: 3,
                maxTotalTravelTimeMinutes: 45 * 8,
                maxAccessEgressTravelTimeMinutes: 45 * 8,
                departureSecondsSinceMidnight: 8 * 3600,
                transitScenario: mockScenario,
                calculatePois: true
            });
        });

    });

    test.each([
        [{ description: 'address has no geography', address: { _sequence: 1, _uuid: 'address-1' as string } }],
        [{ description: 'address geography is undefined', address: { _sequence: 1, _uuid: 'address-1', geography: undefined } }]
    ])('error handling - $description', async ({ address }: { address: Address }) => {
        const result = await getAccessibilityMapFromAddressForSimpleModes(address);

        expect(result).toEqual({
            walking: null,
            cycling: null,
            driving: null
        });
        expect(mockGetTransitAccessibilityMap).not.toHaveBeenCalled();
    });

    test.each([
        {
            description: 'no transit scenario is defined in config',
            setupConfig: () => { delete config.emptyScenarioForSimpleModes; }
        },
        {
            description: 'SE scenario is undefined in config',
            setupConfig: () => { config.emptyScenarioForSimpleModes = undefined; }
        }
    ])('error handling - missing scenario configuration - should return null when $description', async ({ setupConfig }) => {
        setupConfig();

        const address: Address = {
            _sequence: 1,
            _uuid: 'address-1',
            geography: mockGeography
        };

        const result = await getAccessibilityMapFromAddressForSimpleModes(address);

        expect(result).toEqual({
            walking: null,
            cycling: null,
            driving: null
        });
        expect(mockGetTransitAccessibilityMap).not.toHaveBeenCalled();
    });

    test.each([
        {
            description: 'getTransitAccessibilityMap returns error status',
            setupMock: () => {
                mockGetTransitAccessibilityMap.mockResolvedValue({
                    status: 'error',
                    error: 'Service unavailable',
                    source: 'test'
                });
            }
        },
        {
            description: 'exception from getTransitAccessibilityMap',
            setupMock: () => {
                mockGetTransitAccessibilityMap.mockRejectedValue(new Error('Network error'));
            }
        },
        {
            description: 'service throws unexpected error',
            setupMock: () => {
                mockGetTransitAccessibilityMap.mockRejectedValue('Unknown error');
            }
        }
    ])('error handling - accessibility map service errors - should return null when $description', async ({ setupMock }) => {
        const address: Address = {
            _sequence: 1,
            _uuid: 'address-1',
            geography: mockGeography
        };

        setupMock();

        const result = await getAccessibilityMapFromAddressForSimpleModes(address);

        expect(result).toEqual({
            walking: null,
            cycling: null,
            driving: null
        });
        expect(mockGetTransitAccessibilityMap).toHaveBeenCalled();
        expect(mockGetTransitAccessibilityMap).toHaveBeenCalledTimes(3);
    });

    test.each([
        {
            description: 'empty polygon collection',
            polygonFeatures: [[], [], []],
            expected: [{
                duration15Minutes: null,
                duration30Minutes: null,
                duration45Minutes: null
            }, {
                duration15Minutes: null,
                duration30Minutes: null,
                duration45Minutes: null
            }, {
                duration15Minutes: null,
                duration30Minutes: null,
                duration45Minutes: null
            }]
        },
        {
            description: 'missing polygons in result (no 30 minutes for driving and walking, no 15 minutes for cycling)',
            polygonFeatures: [
                [mockWalkingPolygons.features[0], mockWalkingPolygons.features[2]],
                [mockCyclingPolygons.features[1], mockCyclingPolygons.features[2]],
                [mockDrivingPolygons.features[0], mockDrivingPolygons.features[2]]
            ],
            expected: [{
                duration15Minutes: mockWalkingPolygons.features[0],
                duration30Minutes: null,
                duration45Minutes: mockWalkingPolygons.features[2]
            }, {
                duration15Minutes: null,
                duration30Minutes: mockCyclingPolygons.features[1],
                duration45Minutes: mockCyclingPolygons.features[2]
            }, {
                duration15Minutes: mockDrivingPolygons.features[0],
                duration30Minutes: null,
                duration45Minutes: mockDrivingPolygons.features[2]
            }]
        }
    ])('different polygon results - should handle $description', async ({ polygonFeatures, expected }) => {
        const address: Address = {
            _sequence: 1,
            _uuid: 'address-1',
            geography: mockGeography
        };

        mockGetTransitAccessibilityMap.mockResolvedValueOnce({
            status: 'success',
            polygons: {
                type: 'FeatureCollection',
                features: polygonFeatures[0]
            },
            source: 'test'
        });
        mockGetTransitAccessibilityMap.mockResolvedValueOnce({
            status: 'success',
            polygons: {
                type: 'FeatureCollection',
                features: polygonFeatures[1]
            },
            source: 'test'
        });
        mockGetTransitAccessibilityMap.mockResolvedValueOnce({
            status: 'success',
            polygons: {
                type: 'FeatureCollection',
                features: polygonFeatures[2]
            },
            source: 'test'
        });

        const result = await getAccessibilityMapFromAddressForSimpleModes(address);

        expect(result).toEqual({
            walking: expected[0],
            cycling: expected[1],
            driving: expected[2]
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
            expect(result?.resultsByMode.walking).toEqual({ _uuid: 'walking', _sequence: 1, distanceMeters: 1000, travelTimeSeconds: 720 });
            expect(result?.resultsByMode.cycling).toEqual({ _uuid: 'cycling' });
            expect(result?.resultsByMode.driving).toEqual({ _uuid: 'driving' });
            expect(result?.resultsByMode.transit).toEqual({ _uuid: 'transit', _sequence: 0, distanceMeters: 1300, travelTimeSeconds: 600 });
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
            expect(result?.resultsByMode.walking).toEqual({ _uuid: 'walking' });
            expect(result?.resultsByMode.cycling).toEqual({ _uuid: 'cycling' });
            expect(result?.resultsByMode.driving).toEqual({ _uuid: 'driving' });
            expect(result?.resultsByMode.transit).toEqual({ _uuid: 'transit' });
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
