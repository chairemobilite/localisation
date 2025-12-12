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
import { getAddressesArray, getDestinationsArray, getFrequentDestinations } from '../../common/customHelpers';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { destinationsRoutingWidgetsNames, resultsByAddressWidgetsNames, tripModeWidgetsNames } from './widgetsNames';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

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
export const monthlyHousingCost: TextWidgetConfig = {
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

// Custom text widget because the label has placeholders. Also, since the value comes from server, the conditional is on the path itself, so it needs to be custom
export const monthlyCarCost: TextWidgetConfig = {
    ...defaultInputBase.infoTextBase,
    path: 'monthlyCost.carCostMonthly',
    containsHtml: true,
    text: (t: TFunction, interview: UserInterviewAttributes, path) => {
        const monthlyCost = getResponse(interview, path as string, null) as number;
        return monthlyCost === null
            ? t('results:monthlyCost.carCostMonthlyNull')
            : t('results:monthlyCost.carCostMonthly', { carCostMonthly: monthlyCost?.toFixed(2) });
    },
    conditional: (interview: UserInterviewAttributes, path: string) => {
        // If the monthly costs are calculated, then car cost is also calculated (can be null error occurred)
        const monthlyCosts = getResponse(interview, path as string, null, '../');
        return monthlyCosts !== null;
    }
};

// Custom text widget because the label has placeholders. Also, since the value comes from server, the conditional is on the path itself, so it needs to be custom
export const monthlyTotalCost: TextWidgetConfig = {
    ...defaultInputBase.infoTextBase,
    path: 'monthlyCost.totalCostMonthly',
    containsHtml: true,
    text: (t: TFunction, interview: UserInterviewAttributes, path) => {
        const monthlyCost = getResponse(interview, path as string, null) as any;
        return t('results:monthlyCost.totalCostMonthly', { monthlyCost: monthlyCost?.toFixed(2) });
    },
    conditional: (interview: UserInterviewAttributes, path: string) => {
        // FIXME Get a type for this to avoid any casting
        const monthlyCosts = getResponse(interview, path as string, null) as any;
        return monthlyCosts !== null;
    }
};

// Groups information to display the destinations for each address
export const destinationsRouting: GroupConfig = {
    type: 'group',
    path: 'routingTimeDistances',
    title: (t: TFunction) => t('results:FrequentDestinationTitle'),
    name: (t: TFunction, object: unknown, sequence: number | null, interview: UserInterviewAttributes) => {
        const destinations = getFrequentDestinations(interview);
        const label = destinations[(object as any)._uuid]?.name;
        return label !== undefined ? label : t('results:DestinationGroupName', { sequence });
    },
    showGroupedObjectDeleteButton: false,
    showGroupedObjectAddButton: false,
    widgets: destinationsRoutingWidgetsNames
};

// Groups information to display modes of transport for each destination
export const tripMode: GroupConfig = {
    type: 'group',
    path: 'resultsByMode',
    title: (t: TFunction) => t('results:RoutingResultsByMode'),
    name: (t: TFunction, object: unknown, sequence: number | null, interview: UserInterviewAttributes) => {
        const mode = (object as any)._uuid;
        return t(`results:modeNames.${mode}`);
    },
    showGroupedObjectDeleteButton: false,
    showGroupedObjectAddButton: false,
    widgets: tripModeWidgetsNames
};

// Custom because of the insertion of the value in the text
export const tripTime: TextWidgetConfig = {
    ...defaultInputBase.infoTextBase,
    path: 'travelTimeSeconds',
    containsHtml: false,
    text: (t: TFunction, interview: UserInterviewAttributes, path: string) => {
        const tripTravelTime = getResponse(interview, path as string, null);
        if (typeof tripTravelTime !== 'number') {
            return '';
        }
        return t('results:travelTimeSeconds', { minutes: (tripTravelTime / 60).toFixed(0) });
    },
    conditional: (interview: UserInterviewAttributes, path: string) => {
        const tripTravelTime = getResponse(interview, path as string, null);
        return !_isBlank(tripTravelTime);
    }
};

// Custom because of the insertion of the value in the text
export const tripDistance: TextWidgetConfig = {
    ...defaultInputBase.infoTextBase,
    path: 'distanceMeters',
    containsHtml: false,
    text: (t: TFunction, interview: UserInterviewAttributes, path: string) => {
        const tripDistance = getResponse(interview, path as string, null);
        if (typeof tripDistance !== 'number') {
            return '';
        }
        // Add a decimal only for distances under 15 km. See if this threshold
        // makes sense later. Longer than that, decimal is not really required.
        const distanceInKm = tripDistance < 15000 ? (tripDistance / 1000).toFixed(1) : (tripDistance / 1000).toFixed(0);
        return t('results:distanceMeters', { distance: distanceInKm });
    },
    conditional: (interview: UserInterviewAttributes, path: string) => {
        const tripDistance = getResponse(interview, path as string, null);
        return !_isBlank(tripDistance);
    }
};
