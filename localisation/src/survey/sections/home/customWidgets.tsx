import { TFunction } from 'i18next';
import config from 'chaire-lib-common/lib/config/shared/project.config';
import { inputMapFindPlaceBase } from 'evolution-frontend/lib/components/inputs/defaultInputBase';
import { InputMapFindPlaceType } from 'evolution-common/lib/services/questionnaire/types';
import { getActivityMarkerIcon } from 'evolution-common/lib/services/questionnaire/sections/visitedPlaces/activityIconMapping';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import { getGeographyCustomValidation } from '../../common/customValidations';
import { defaultInvalidGeocodingResultTypes } from '../../common/customGeoData';

export const home_geography: InputMapFindPlaceType = {
    ...inputMapFindPlaceBase,
    path: 'home.geography',
    label: (t: TFunction, _interview, _path) => {
        return t('home:home.geography');
    },
    icon: {
        url: getActivityMarkerIcon('home'),
        size: [70, 70]
    },
    placesIcon: {
        url: (_interview, _path) => '/dist/icons/interface/markers/marker_round_with_small_circle.svg',
        size: [35, 35]
    },
    selectedIcon: {
        url: (_interview, _path) => '/dist/icons/interface/markers/marker_round_with_small_circle_selected.svg',
        size: [35, 35]
    },
    geocodingQueryString: (interview) => {
        const city = surveyHelper.getResponse(interview, 'home.city', null);
        const address = surveyHelper.getResponse(interview, 'home.address', null);
        const postalCode = surveyHelper.getResponse(interview, 'home.postalCode', null);
        const region = surveyHelper.getResponse(interview, 'home.region', null);

        // Fields to use for geocoding
        const fieldsAddress = [];
        // Postal code is optional
        if (postalCode !== null) {
            fieldsAddress.push(postalCode);
        }
        fieldsAddress.push(city, address, region);

        return [{ queryString: surveyHelper.formatGeocodingQueryStringFromMultipleFields(fieldsAddress), zoom: 16 }];
    },
    defaultCenter: config.mapDefaultCenter,
    defaultZoom: config.mapDefaultZoom,
    invalidGeocodingResultTypes: defaultInvalidGeocodingResultTypes,
    validations: (value, _customValue, interview, path) =>
        getGeographyCustomValidation({
            value,
            interview,
            path
        })
    // conditional: conditionals.homeGeographyConditional
};
