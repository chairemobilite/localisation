import { center as turfCenter } from '@turf/turf';
import { TFunction } from 'i18next';

import {
    type InfoMapWidgetConfig,
    type UserInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';
import { getActivityMarkerIcon } from 'evolution-common/lib/services/questionnaire/sections/visitedPlaces/activityIconMapping';
import { getAddressesArray, getDestinationsArray } from '../../common/customHelpers';
import type { AccessibilityPanelAttrs } from '../../common/types';

// Colors taken from a qualitative color scheme from ColorBrewer https://colorbrewer2.org/#type=qualitative&scheme=Accent&n=5
const colorPalette = ['#7fc97f', '#beaed4', '#fdc086', '#ffff99', '#386cb0'];

// Info map widget showing all addresses and visited places and possibly other data
// Custom because it is an info map and cannot be described in the generator
export const comparisonMap: InfoMapWidgetConfig = {
    type: 'infoMap',
    path: 'addresses.comparisonMap',
    defaultCenter: (interview: UserInterviewAttributes) => {
        const addresses = getAddressesArray(interview);
        const geographies = addresses
            .filter((address) => address.geography && address.geography.geometry?.type === 'Point')
            .map((address) => address.geography);
        if (geographies.length === 0) {
            // Will fallback to default center
            return undefined;
        }
        const centerPoint = turfCenter({
            type: 'FeatureCollection',
            features: geographies
        });
        return { lat: centerPoint.geometry.coordinates[1], lon: centerPoint.geometry.coordinates[0] };
    },
    height: 'calc(100vh - 170px)', // Adjusted to account for the header
    title: (t: TFunction) => t('results:comparisonMap'),
    linestringColor: '#0000ff',
    geojsons: (interview) => {
        const pointGeographies = [];
        const polygonGeographies: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[] = [];
        const addresses = getAddressesArray(interview);

        // Type assertion to access accessibilityPanel which may be present at runtime
        // Note: This is a workaround to access the accessibilityPanel data directly from the template file
        // TODO: This is a workaround to access the accessibilityPanel data directly from the template file.
        // TODO: We should find a better way to save the data in the interview.
        const interviewWithPanel = interview as UserInterviewAttributes & {
            accessibilityPanel?: AccessibilityPanelAttrs;
        };
        const selectedLocation: 'both' | 'first' | 'second' =
            interviewWithPanel?.accessibilityPanel?.selectedLocation ?? 'both';
        const selectedTravelTime: '15' | '30' | '45' =
            interviewWithPanel?.accessibilityPanel?.selectedTravelTime ?? '30';
        const selectedMode: 'walking' | 'cycling' | 'transit' =
            interviewWithPanel?.accessibilityPanel?.selectedMode ?? 'transit';

        // Loop through all addresses and process the ones that are valid for the selected location, travel time, and mode
        for (let addressIndex = 0; addressIndex < addresses.length; addressIndex++) {
            const address = addresses[addressIndex];
            if (!address.geography || address.geography.geometry?.type !== 'Point') {
                continue;
            }

            // Filter addresses based on selectedLocation:
            // - 'first': only process the first valid address (addressIndex === 0)
            // - 'second': only process the second valid address (addressIndex === 1)
            // - 'both': process all valid addresses
            const shouldProcessAddress =
                selectedLocation === 'both' ||
                (selectedLocation === 'first' && addressIndex === 0) ||
                (selectedLocation === 'second' && addressIndex === 1);

            if (!shouldProcessAddress) {
                // Skip this address
                continue;
            }

            // Copy the geography to avoid modifying the interview data
            const addressGeography = {
                ...address.geography,
                properties: { ...(address.geography.properties || {}) }
            };
            // Use red icon for first visible address, green for second visible address, default for others
            let iconUrl: string;
            if (addressIndex === 0) {
                iconUrl = '/dist/icons/activities/home/home-marker_round_green.svg';
            } else if (addressIndex === 1) {
                iconUrl = '/dist/icons/activities/home/home-marker_round_red.svg';
            } else {
                iconUrl = getActivityMarkerIcon('home');
            }
            addressGeography.properties!.icon = {
                url: iconUrl,
                size: [40, 40]
            };
            addressGeography.properties!.highlighted = false;
            addressGeography.properties!.label = address.name;
            addressGeography.properties!.sequence = address._sequence;
            pointGeographies.push(addressGeography);

            // Transform the selected travel time to the property name of the accessibility map
            const durationProperty = `duration${selectedTravelTime}Minutes` as
                | 'duration15Minutes'
                | 'duration30Minutes'
                | 'duration45Minutes';
            const accessibilityMap = address.accessibilityMapsByMode?.[selectedMode]?.[durationProperty];

            // Add the accessibility map polygons for the selected travel time and mode
            // Use addressIndex to determine color: house #1 (index 0) gets colorPalette[0], house #2 (index 1) gets colorPalette[1]
            if (accessibilityMap) {
                const accessibilityMapPolygon = {
                    ...accessibilityMap,
                    properties: {
                        ...(accessibilityMap.properties || {}),
                        strokeColor: colorPalette[addressIndex],
                        fillColor: colorPalette[addressIndex]
                    }
                };
                polygonGeographies.push(accessibilityMapPolygon);
            }
        }

        const visitedPlaces = getDestinationsArray(interview);
        let visitedPlaceIndex = 0; // Track index of visited places with valid geography
        for (let i = 0; i < visitedPlaces.length; i++) {
            const place = visitedPlaces[i];
            if (!place.geography || place.geography.geometry?.type !== 'Point') {
                continue;
            }
            // Copy the geography to avoid modifying the interview data
            const placeGeography = {
                ...place.geography,
                properties: { ...(place.geography.properties || {}) }
            };
            // Use orange icon with arrow for first visible visited place, purple for second, default for others
            let iconUrl: string;
            if (visitedPlaceIndex === 0) {
                iconUrl = '/dist/icons/activities/other/down_arrow-marker_round_orange.svg';
            } else if (visitedPlaceIndex === 1) {
                iconUrl = '/dist/icons/activities/other/down_arrow-marker_round_purple.svg';
            } else {
                iconUrl = getActivityMarkerIcon(null);
            }
            placeGeography.properties!.icon = {
                url: iconUrl,
                size: [40, 40]
            };
            placeGeography.properties!.highlighted = false;
            placeGeography.properties!.label = place.name;
            placeGeography.properties!.sequence = place._sequence;
            pointGeographies.push(placeGeography);
            visitedPlaceIndex++;
        }

        return {
            points: {
                type: 'FeatureCollection',
                features: pointGeographies
            },
            polygons: {
                type: 'FeatureCollection',
                features: polygonGeographies
            }
        };
    }
};
