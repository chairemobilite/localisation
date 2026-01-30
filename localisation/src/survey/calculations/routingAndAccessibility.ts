import { calculateTimeDistanceByMode, getTransitAccessibilityMap } from 'evolution-backend/lib/services/routing';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import type {
    Address,
    RoutingByModeDistanceAndTime,
    Destination,
    AddressAccessibilityMapsDurations
} from '../common/types';
import type { RoutingOrTransitMode } from 'chaire-lib-common/lib/config/routingModes';
import type {
    AccessibilityMapCalculationParameter,
    AccessibilityMapPolygonProperties
} from 'evolution-backend/lib/services/routing/types';

const getAccessibilityMapFromAddress = async ({
    address,
    scenario,
    extraParameters,
    timeMappings = [15, 30, 45]
}: {
    address: Address;
    scenario?: string;
    extraParameters: Partial<AccessibilityMapCalculationParameter>;
    // FIXME Because of speed limitations, the time mappings allow to request
    // higher values for modes like driving and cycling, while mapping to 15, 30
    // and 45 minutes equivalent. This value will not be needed when we actually
    // support mode-specific isochrones in the API.
    timeMappings?: number[];
}): Promise<AddressAccessibilityMapsDurations | null> => {
    try {
        const addressGeography = address.geography;
        if (!addressGeography) {
            console.error('No geography found for address when getting accessibility map');
            return null;
        }
        if (scenario === undefined) {
            console.error('No transit scenario defined in config for accessibility map calculation');
            return null;
        }
        // This will get 3 polygons for 15, 30 and 45 minutes that will be assigned to each property of the result
        const accessibilityMapResponse = await getTransitAccessibilityMap({
            point: addressGeography,
            transitScenario: scenario,
            numberOfPolygons: 3,
            calculatePois: true,
            maxTotalTravelTimeMinutes: timeMappings[2],
            // FIXME Allow to parameterize these values
            departureSecondsSinceMidnight: 8 * 3600, // 8 AM
            ...extraParameters
        });
        if (accessibilityMapResponse.status !== 'success') {
            console.log('Error getting accessibility map: ', JSON.stringify(accessibilityMapResponse));
            return null;
        }

        const findPolygonByDuration =
            (durationMinutes: number) =>
                (p: GeoJSON.Feature<GeoJSON.MultiPolygon, AccessibilityMapPolygonProperties>) =>
                    p.properties.durationSeconds === durationMinutes;
        const polygonsByDuration = {
            duration15Minutes:
                accessibilityMapResponse.polygons.features.find(findPolygonByDuration(timeMappings[0] * 60)) || null,
            duration30Minutes:
                accessibilityMapResponse.polygons.features.find(findPolygonByDuration(timeMappings[1] * 60)) || null,
            duration45Minutes:
                accessibilityMapResponse.polygons.features.find(findPolygonByDuration(timeMappings[2] * 60)) || null
        };
        return polygonsByDuration;
    } catch (error) {
        console.error('Error getting accessibility map from address', error);
        return null;
    }
};

/**
 * Calculate the accessibility map for an address
 * @param address The address from which to get the accessibility map
 * @returns A multipolygon of the data, or null if the result could not be
 * calculated correctly
 */
export const getAccessibilityMapFromAddressForTransit = async (
    address: Address
): Promise<AddressAccessibilityMapsDurations | null> => {
    return getAccessibilityMapFromAddress({ address, scenario: config.trRoutingScenarios?.SE, extraParameters: {} });
};

const walkingSpeedKmPerHour = 5;
// Speed of cycling is 15 km/h, so 3 times faster than walking
const cyclingSpeedKmPerHour = 15;
const cyclingTimingFactor = cyclingSpeedKmPerHour / walkingSpeedKmPerHour;
// Speed of driving is 40 km/h, so 8 times faster than walking
const drivingSpeedKmPerHour = 40;
const drivingTimingFactor = drivingSpeedKmPerHour / walkingSpeedKmPerHour;
/**
 * Calculate the accessibility maps for simple modes (walking, cycling, driving)
 * @param address The address form whcih to get the accessibility maps
 * @returns An accessibility map by duration for walking, cycling and driving
 */
export const getAccessibilityMapFromAddressForSimpleModes = async (
    address: Address
): Promise<{
    walking: AddressAccessibilityMapsDurations | null;
    cycling: AddressAccessibilityMapsDurations | null;
    driving: AddressAccessibilityMapsDurations | null;
}> => {
    // FIXME Hack: we use accessibility map for an empty transit scenario to
    // get isochrones for simple modes. We just need to set the accessEgress
    // time to the maximum duration, with a walking speed corresponding to
    // the speed of the mode.
    return {
        walking: await getAccessibilityMapFromAddress({
            address,
            scenario: config.emptyScenarioForSimpleModes,
            extraParameters: { maxAccessEgressTravelTimeMinutes: 45, walkingSpeedKmPerHour: walkingSpeedKmPerHour }
        }),
        cycling: await getAccessibilityMapFromAddress({
            address,
            scenario: config.emptyScenarioForSimpleModes,
            extraParameters: { maxAccessEgressTravelTimeMinutes: 45 * cyclingTimingFactor },
            timeMappings: [15 * cyclingTimingFactor, 30 * cyclingTimingFactor, 45 * cyclingTimingFactor]
        }),
        driving: await getAccessibilityMapFromAddress({
            address,
            scenario: config.emptyScenarioForSimpleModes,
            extraParameters: { maxAccessEgressTravelTimeMinutes: 45 * drivingTimingFactor },
            timeMappings: [15 * drivingTimingFactor, 30 * drivingTimingFactor, 45 * drivingTimingFactor]
        })
    };
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
            // FIXME Initialized with a _uuid parameter just to satisfy the
            // Evolution framework, but if the results display is moved out of
            // Evolution, set to `null` by default instead to clarify that the
            // values are not available
            walking: { _uuid: 'walking' },
            cycling: { _uuid: 'cycling' },
            driving: { _uuid: 'driving' },
            transit: { _uuid: 'transit' }
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
