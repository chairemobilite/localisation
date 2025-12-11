import { getTransitAccessibilityMap } from 'evolution-backend/lib/services/routing';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { Address } from '../common/types';

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
