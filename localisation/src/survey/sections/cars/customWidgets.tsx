import { TFunction } from 'i18next';
import { GroupConfig } from 'evolution-common/lib/services/questionnaire/types';
import { carInformationWidgetsNames } from './widgetsNames';
import { countCars } from '../../common/customHelpers';

const MAX_CARS_COUNT = 13;

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
    showGroupedObjectDeleteButton: function (_interview, _path) {
        return true;
    },
    showGroupedObjectAddButton: function (interview, _path) {
        const carCount = countCars({ interview });
        return carCount < MAX_CARS_COUNT;
    },
    groupedObjectAddButtonLabel: (t: TFunction) => t('cars:addGroupedObject'),
    groupedObjectDeleteButtonLabel: (t: TFunction) => t('cars:deleteThisGroupedObject'),
    addButtonSize: 'small',
    widgets: carInformationWidgetsNames
};
