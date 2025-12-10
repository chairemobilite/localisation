import { TFunction } from 'i18next';
import { GroupConfig } from 'evolution-common/lib/services/questionnaire/types';
import { carInformationWidgetsNames } from './widgetsNames';

// This custom widget groups information widgets for individual cars.
export const carInformation: GroupConfig = {
    type: 'group',
    path: 'cars',
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
        return false;
    },
    showGroupedObjectAddButton: function (_interview, _path) {
        return false;
    },
    groupedObjectAddButtonLabel: (t: TFunction) => t('cars:addGroupedObject'),
    groupedObjectDeleteButtonLabel: (t: TFunction) => t('cars:deleteThisGroupedObject'),
    addButtonSize: 'small',
    widgets: carInformationWidgetsNames
};
