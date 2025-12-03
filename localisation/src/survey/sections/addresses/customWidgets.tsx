import { addressesInfoWidgetsNames } from './widgetsNames';
import { TFunction } from 'i18next';
import { GroupConfig, InputMapFindPlaceType, InputStringType } from 'evolution-common/lib/services/questionnaire/types';
import config from 'evolution-common/lib/config/project.config';
import { formatGeocodingQueryStringFromMultipleFields, getResponse } from 'evolution-common/lib/utils/helpers';
import { getActivityMarkerIcon } from 'evolution-common/lib/services/questionnaire/sections/visitedPlaces/activityIconMapping';
import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { defaultInvalidGeocodingResultTypes } from '../../common/customGeoData';
import { getGeographyCustomValidation } from '../../common/customValidations';
import * as customConditionals from '../../common/customConditionals';
import * as customValidations from '../../common/customValidations';

// We need a custom widget to group and duplicate the widgets for the info on the addresses we want to compare, such as the living costs and location
export const addressesInfo: GroupConfig = {
    type: 'group',
    path: 'addresses.information',
    title: {
        fr: 'Information sur les adresses potentielles',
        en: 'Information on the potential addresses'
    },
    name: {
        fr: function (groupedObject: any, sequence, _interview) {
            return `Adresse ${sequence || groupedObject['_sequence']}`;
        },
        en: function (groupedObject: any, sequence, _interview) {
            return `Address ${sequence || groupedObject['_sequence']}`;
        }
    },
    showGroupedObjectDeleteButton: function (_interview, _path) {
        return false;
    },
    showGroupedObjectAddButton: function (_interview, _path) {
        return false;
    },
    addButtonSize: 'small',
    widgets: addressesInfoWidgetsNames
};

// Custom map widget to input the address location
export const addressGeography: InputMapFindPlaceType = {
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
    label: (t: TFunction, _interview) => t('addresses:geography'),
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

//TODO: We might want to add this to the default input base
const inputDecimalBase: Pick<
    InputStringType,
    'type' | 'inputType' | 'datatype' | 'size' | 'inputFilter' | 'keyboardInputMode'
> = {
    type: 'question',
    inputType: 'string',
    datatype: 'float',
    size: 'small',
    inputFilter: (value) => {
        // Remove all characters that are not a number or a period
        return value.replace(/[^0-9.]/g, '');
    },
    keyboardInputMode: 'decimal'
};

// We need a custom widget to input decimal numbers, which is important for an interest rate. The default number input widget only accepts integers
export const addressInterestRate: InputStringType = {
    ...inputDecimalBase,
    path: 'interestRate',
    twoColumns: false,
    containsHtml: true,
    label: (t: TFunction) => t('addresses:interestRate'),
    conditional: customConditionals.ifOwnershipTypeIsBuyCustomConditional,
    validations: customValidations.interestRateCustomValidation
};
