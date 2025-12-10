import { InfoMapWidgetConfig, UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { center as turfCenter } from '@turf/turf';
import { TFunction } from 'i18next';
import { getActivityMarkerIcon } from 'evolution-common/lib/services/questionnaire/sections/visitedPlaces/activityIconMapping';
import { getAddressesArray, getDestinationsArray } from '../../common/customHelpers';

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
        const geographies = [];
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
            geographies.push(addressGeography);
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
            geographies.push(placeGeography);
        }
        return {
            points: {
                type: 'FeatureCollection',
                features: geographies
            }
        };
    }
};
