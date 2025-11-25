import { TFunction } from 'i18next';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { GroupConfig } from 'evolution-common/lib/services/questionnaire/types';
import { carInformationWidgetsNames } from './widgetsNames';
import { countCars } from '../../common/customHelpers';

// This custom widget groups information widgets for individual cars. It is similar to the custom widgets in household, grouping information on individual persons.
export const carInformation: GroupConfig = {
    type: 'group',
    path: 'cars.information',
    title: {
        fr: 'Information sur les voitures',
        en: 'Information on the cars'
    },
    name: {
        fr: function (groupedObject: any, sequence, _interview) {
            return `Voiture ${sequence || groupedObject['_sequence']}`;
        },
        en: function (groupedObject: any, sequence, _interview) {
            return `Car ${sequence || groupedObject['_sequence']}`;
        }
    },
    showGroupedObjectDeleteButton: function (interview, _path) {
        const carInfoCount = countCars({ interview });
        const householdCarNumber = getResponse(interview, 'household.carNumber', null);
        const householdCarNumberNum = householdCarNumber ? Number(householdCarNumber) : undefined;
        return householdCarNumberNum ? carInfoCount > householdCarNumberNum : false;
    },
    showGroupedObjectAddButton: function (_interview, _path) {
        return true;
    },
    groupedObjectAddButtonLabel: (t: TFunction) => t('cars:addGroupedObject'),
    groupedObjectDeleteButtonLabel: (t: TFunction) => t('cars:deleteThisGroupedObject'),
    addButtonSize: 'small',
    widgets: carInformationWidgetsNames
};
