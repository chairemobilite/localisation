import { booleanPointInPolygon as turfBooleanPointInPolygon } from '@turf/turf';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { type ValidationFunction } from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { TFunction } from 'i18next';
// FIXME Find a way to parameterize the inaccessible zones
import inaccessibleZones from '../geojson/inaccessibleZones.json';
import quebecWaterWays from '../geojson/quebecWaterWaysSimplified.json';

// Return the validations for the geography
export const getGeographyCustomValidation = ({ value, interview, path }) => {
    const geography: any = getResponse(interview, path, null);
    const geocodingTextInput = geography ? geography.properties?.geocodingQueryString : undefined;

    return [
        {
            validation: _isBlank(value),
            errorMessage: {
                fr: 'Le positionnement du lieu est requis.',
                en: 'Positioning of the place is required.'
            }
        },
        {
            validation:
                geography &&
                geography.properties?.lastAction &&
                (geography.properties?.lastAction === 'mapClicked' ||
                    geography.properties?.lastAction === 'markerDragged') &&
                geography.properties?.zoom < 15,
            errorMessage: {
                fr: 'Le positionnement du lieu n\'est pas assez précis. Utilisez le zoom + pour vous rapprocher davantage, puis précisez la localisation en déplaçant l\'icône.',
                en: 'The positioning of the place is not precise enough. Please use the + zoom and drag the icon marker to confirm the precise location.'
            }
        },
        {
            validation: geography && geography.properties?.isGeocodingImprecise,
            errorMessage: {
                fr: `<strong>Le nom du lieu utilisé pour effectuer la recherche ${
                    !_isBlank(geocodingTextInput) ? `("${geocodingTextInput}")` : ''
                } n'est pas assez précis.</strong> Ajoutez de l'information ou précisez l'emplacement à l'aide de la carte.`,
                en: `<strong>The location name used for searching ${
                    !_isBlank(geocodingTextInput) ? `("${geocodingTextInput}")` : ''
                } is not specific enough.</strong> Please add more information or specify the location more precisely using the map.`
            }
        },
        ...inaccessibleZoneGeographyCustomValidation(geography, undefined, interview, path)
    ];
};

export const inaccessibleZoneGeographyCustomValidation: ValidationFunction = (geography) => {
    return [
        {
            validation:
                geography &&
                (turfBooleanPointInPolygon(
                    geography as any,
                    inaccessibleZones.features[0] as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
                ) ||
                    turfBooleanPointInPolygon(
                        geography as any,
                        quebecWaterWays.features[0] as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
                    )),
            errorMessage: (t: TFunction) => t('survey:visitedPlace:locationIsNotAccessibleError')
        }
    ];
};

export const interestRateCustomValidation: ValidationFunction = (value) => {
    return [
        {
            validation: _isBlank(value),
            errorMessage: {
                fr: 'Le taux d\'intérêt est requis.',
                en: 'Interest rate is required.'
            }
        },
        {
            validation: isNaN(Number(value)),
            errorMessage: {
                fr: 'Le taux d\'intérêt est invalide.',
                en: 'Interest rate is invalid.'
            }
        },
        {
            validation: Number(value) < 0,
            errorMessage: {
                fr: 'Le taux d\'intérêt doit être au moins de 0%.',
                en: 'Interest rate must be at least 0%.'
            }
        },
        {
            validation: Number(value) > 100,
            errorMessage: {
                fr: 'Le taux d\'intérêt doit être au plus 100%.',
                en: 'Interest rate must be at most 100%.'
            }
        }
    ];
};
