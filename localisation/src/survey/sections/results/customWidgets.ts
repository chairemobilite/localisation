import { center as turfCenter } from '@turf/turf';
import { TFunction } from 'i18next';

import {
    GroupConfig,
    InfoMapWidgetConfig,
    TextWidgetConfig,
    UserInterviewAttributes
} from 'evolution-common/lib/services/questionnaire/types';
import { getActivityMarkerIcon } from 'evolution-common/lib/services/questionnaire/sections/visitedPlaces/activityIconMapping';
import * as defaultInputBase from 'evolution-frontend/lib/components/inputs/defaultInputBase';
import { getAddressesArray, getDestinationsArray } from '../../common/customHelpers';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { resultsByAddressWidgetsNames } from './widgetsNames';

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
    title: (t: TFunction, interview: UserInterviewAttributes) => t('results:comparisonMap'),
    linestringColor: '#0000ff',
    geojsons: (interview) => {
        const pointGeographies = [];
        const polygonGeographies: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[] = [];
        const addresses = getAddressesArray(interview);
        let addressIndex = 0; // Track index of addresses with valid geography
        for (let i = 0; i < addresses.length; i++) {
            const address = addresses[i];
            if (!address.geography || address.geography.geometry?.type !== 'Point') {
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
                iconUrl = '/dist/icons/activities/home/home-marker_round_red.svg';
            } else if (addressIndex === 1) {
                iconUrl = '/dist/icons/activities/home/home-marker_round_green.svg';
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

            if (address.accessibilityMap) {
                const accessibilityMapPolygons = address.accessibilityMap.features.map((feature) => ({
                    ...feature,
                    properties: {
                        ...(feature.properties || {}),
                        strokeColor: colorPalette[addressIndex % colorPalette.length],
                        fillColor: colorPalette[addressIndex % colorPalette.length]
                    }
                }));
                polygonGeographies.push(...accessibilityMapPolygons);
            }
            addressIndex++;
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
                iconUrl = '/dist/icons/activities/other/question_mark-marker_round_orange.svg';
            } else if (visitedPlaceIndex === 1) {
                iconUrl = '/dist/icons/activities/other/question_mark-marker_round_purple.svg';
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

// Groups information to display the results by address
export const resultsByAddress: GroupConfig = {
    type: 'group',
    path: 'addresses',
    title: {
        fr: 'Adresses',
        en: 'Addresses'
    },
    name: (t: TFunction, object: unknown, sequence: number | null, interview: UserInterviewAttributes) => {
        return t('results:addressGroupName', { count: sequence });
    },
    showGroupedObjectDeleteButton: false,
    showGroupedObjectAddButton: false,
    widgets: resultsByAddressWidgetsNames
};

// Custom text widget because the label has placeholders. Also, since the value comes from server, the conditional is on the path itself, so it needs to be custom
export const monthlyCost: TextWidgetConfig = {
    ...defaultInputBase.infoTextBase,
    path: 'monthlyCost.housingCostMonthly',
    containsHtml: true,
    text: (t: TFunction, interview: UserInterviewAttributes, path) => {
        const monthlyCost = getResponse(interview, path as string, null) as number;
        return t('results:monthlyCost.housingCostMonthly', { housingCostMonthly: monthlyCost?.toFixed(2) });
    },
    conditional: (interview: UserInterviewAttributes, path: string) => {
        const monthlyCost = getResponse(interview, path as string, null);
        return monthlyCost !== null;
    }
};
