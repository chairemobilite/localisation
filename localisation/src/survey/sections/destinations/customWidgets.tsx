import { frequentVisitedPlacesWidgetsNames } from './widgetsNames';
import { TFunction } from 'i18next';
import { GroupConfig, InputMapFindPlaceType } from 'evolution-common/lib/services/questionnaire/types';
import config from 'evolution-common/lib/config/project.config';
import { formatGeocodingQueryStringFromMultipleFields, getResponse } from 'evolution-common/lib/utils/helpers';
import { getActivityMarkerIcon } from 'evolution-common/lib/services/questionnaire/sections/visitedPlaces/activityIconMapping';
import { defaultInvalidGeocodingResultTypes } from '../../common/customGeoData';
import { getGeographyCustomValidation } from '../../common/customValidations';

// Groups information widgets for individual destinations.
export const frequentVisitedPlaces: GroupConfig = {
    type: 'group',
    path: 'destinations',
    title: {
        fr: 'Destinations fréquentes',
        en: 'Frequent destinations'
    },
    name: {
        fr: function (groupedObject: any, sequence, _interview) {
            return `Destination ${sequence || groupedObject['_sequence']}`;
        },
        en: function (groupedObject: any, sequence, _interview) {
            return `Destination ${sequence || groupedObject['_sequence']}`;
        }
    },
    showGroupedObjectDeleteButton: function (interview, _path) {
        return false;
    },
    showGroupedObjectAddButton: function (_interview, _path) {
        return false;
    },
    groupedObjectAddButtonLabel: (t: TFunction) => t('destinations:addGroupedObject'),
    groupedObjectDeleteButtonLabel: (t: TFunction) => t('destinations:deleteThisGroupedObject'),
    addButtonSize: 'small',
    widgets: frequentVisitedPlacesWidgetsNames
};

// Custom map widget to input the destination location
export const visitedPlaceGeography: InputMapFindPlaceType = {
    type: 'question',
    inputType: 'mapFindPlace',
    path: 'geography',
    datatype: 'geojson',
    containsHtml: true,
    height: '32rem',
    refreshGeocodingLabel: (t: TFunction) => t('customLabel:RefreshGeocodingLabel'),
    geocodingQueryString: function (interview, path) {
        return formatGeocodingQueryStringFromMultipleFields([getResponse(interview, path, null, '../name')]);
    },
    maxGeocodingResultsBounds: function (_interview, _path) {
        return (config as any).mapMaxGeocodingResultsBounds;
    },
    invalidGeocodingResultTypes: defaultInvalidGeocodingResultTypes,
    label: (t: TFunction, _interview) => t('destination:geography'),
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
    defaultCenter: config.mapDefaultCenter,
    validations: (value, _customValue, interview, path) =>
        getGeographyCustomValidation({
            value,
            interview,
            path
        })
};
