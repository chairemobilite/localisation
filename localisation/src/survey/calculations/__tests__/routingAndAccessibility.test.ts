/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { getAccessibilityMapFromAddress } from '../routingAndAccessibility';
import { Address } from '../../common/types';
import * as routing from 'evolution-backend/lib/services/routing';
import config from 'chaire-lib-common/lib/config/shared/project.config';

// Mock the routing module
jest.mock('evolution-backend/lib/services/routing');

const mockGetTransitAccessibilityMap = routing.getTransitAccessibilityMap as jest.MockedFunction<
    typeof routing.getTransitAccessibilityMap
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
