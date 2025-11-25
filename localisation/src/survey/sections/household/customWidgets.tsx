import { TFunction } from 'i18next';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { GroupConfig } from 'evolution-common/lib/services/questionnaire/types';
import { countPersons } from 'evolution-common/lib/services/odSurvey/helpers';
import { householdMembersWidgetsNames } from './widgetsNames';

export const householdMembers: GroupConfig = {
    type: 'group',
    path: 'household.persons',
    title: {
        fr: 'Membres du ménage',
        en: 'Household members'
    },
    name: {
        fr: function (groupedObject: any, sequence, interview) {
            const householdSize = getResponse(interview, 'household.size', 1);
            if (householdSize === 1) {
                return 'Veuillez entrer les informations suivantes:';
            }
            return `Personne ${sequence || groupedObject['_sequence']} ${
                groupedObject.nickname ? `• **${groupedObject.nickname}**` : ''
            }`;
        },
        en: function (groupedObject: any, sequence, interview) {
            const householdSize = getResponse(interview, 'household.size', 1);
            if (householdSize === 1) {
                return 'Please enter the following information:';
            }
            return `Person ${sequence || groupedObject['_sequence']} ${
                groupedObject.nickname ? `• **${groupedObject.nickname}**` : ''
            }`;
        }
    },
    showGroupedObjectDeleteButton: function (interview, _path) {
        const personsCount = countPersons({ interview });
        const householdSize = getResponse(interview, 'household.size', null);
        const householdSizeNum = householdSize ? Number(householdSize) : undefined;
        return householdSizeNum ? personsCount > householdSizeNum : false;
    },
    showGroupedObjectAddButton: function (_interview, _path) {
        return true;
    },
    groupedObjectAddButtonLabel: (t: TFunction) => t('household:addGroupedObject'),
    groupedObjectDeleteButtonLabel: (t: TFunction) => t('household:deleteThisGroupedObject'),
    addButtonSize: 'small',
    widgets: householdMembersWidgetsNames
};
