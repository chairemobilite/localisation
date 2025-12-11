import { calculateTimeDistanceByMode, getTransitAccessibilityMap } from 'evolution-backend/lib/services/routing';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { Address, RoutingByModeDistanceAndTime, Destination } from '../common/types';
import { RoutingOrTransitMode } from 'chaire-lib-common/lib/config/routingModes';

/**
 * Calculate the accessibility map for an address
 * @param address The address from which to get the accessibility map
 * @returns A multipolygon of the data, or null if the result could not be
 * calculated correctly
 */
export const getAccessibilityMapFromAddress = async (
    address: Address
): Promise<GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> | null> => {
    try {
        const addressGeography = address.geography;
        if (!addressGeography) {
            console.error('No geography found for address when getting accessibility map');
            return null;
        }
        // Take a week scenario, as defined in the config
        const scenario = config.trRoutingScenarios?.SE;
        if (scenario === undefined) {
            console.error('No transit scenario defined in config for accessibility map calculation');
            return null;
        }
        const accessibilityMapResponse = await getTransitAccessibilityMap({
            point: addressGeography,
            numberOfPolygons: 1,
            // FIXME allow to parameterize this
            maxTotalTravelTimeMinutes: 30,
            // FIXME Allow to parameterize these values
            departureSecondsSinceMidnight: 8 * 3600, // 8 AM
            transitScenario: scenario,
            calculatePois: true
        });
        if (accessibilityMapResponse.status !== 'success') {
            console.log('Error getting summary: ', JSON.stringify(accessibilityMapResponse));
            return null;
        }
        return accessibilityMapResponse.polygons;
    } catch (error) {
        console.error('Error getting accessibility map from address', error);
        return null;
    }
};

const calculationModes = ['transit', 'walking', 'cycling', 'driving'] as RoutingOrTransitMode[];
export const getRoutingFromAddressToDestination = async (
    address: Address,
    destination: Destination
): Promise<RoutingByModeDistanceAndTime | null> => {
    try {
        // Validate geographies
        const addressGeography = address.geography;
        if (!addressGeography) {
            console.error('No geography found for address when getting routing');
            return null;
        }
        const destinationGeography = destination.geography;
        if (!destinationGeography) {
            console.error('No geography found for destination when getting routing');
            return null;
        }
        // Take a week scenario, as defined in the config
        const scenario = config.trRoutingScenarios?.SE;
        if (scenario === undefined) {
            console.error('No transit scenario defined in config for routing calculation');
            return null;
        }

        // Calculate time and distances by mode
        const timeAndDistances = await calculateTimeDistanceByMode(calculationModes, {
            origin: addressGeography,
            destination: destinationGeography,
            departureSecondsSinceMidnight: 8 * 3600,
            // Date is not required, just take today's date
            departureDateString: new Date().toISOString().split('T')[0],
            transitScenario: scenario
        });
        const results = {
            walking: null,
            cycling: null,
            driving: null,
            transit: null
        } as RoutingByModeDistanceAndTime['resultsByMode'];
        calculationModes.forEach((mode, index) => {
            const modeTimeAndDistance = timeAndDistances[mode];
            if (modeTimeAndDistance.status !== 'success') {
                console.log(`No routing found for mode ${mode}: `, JSON.stringify(timeAndDistances[mode]));
                return;
            }
            results[mode] = {
                _uuid: mode,
                _sequence: index,
                distanceMeters: modeTimeAndDistance.distanceM,
                travelTimeSeconds: modeTimeAndDistance.travelTimeS
            };
        });
        return { _uuid: destination._uuid, _sequence: destination._sequence, resultsByMode: results };
    } catch (error) {
        console.error('Error getting routing from address to destination', error);
        return null;
    }
};
