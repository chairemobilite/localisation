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
            addressGeography.properties!.icon = {
                url: getActivityMarkerIcon('home'),
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
                        strokeColor: colorPalette[i % colorPalette.length],
                        fillColor: colorPalette[i % colorPalette.length]
                    }
                }));
                polygonGeographies.push(...accessibilityMapPolygons);
            }
        }

        const visitedPlaces = getDestinationsArray(interview);
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
            placeGeography.properties!.icon = {
                url: getActivityMarkerIcon(null),
                size: [40, 40]
            };
            placeGeography.properties!.highlighted = false;
            placeGeography.properties!.label = place.name;
            placeGeography.properties!.sequence = place._sequence;
            pointGeographies.push(placeGeography);
        }
        // Return as a FeatureCollection
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
