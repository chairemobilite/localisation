import { isSectionCompleted } from 'evolution-common/lib/services/questionnaire/sections/navigationHelpers';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { widgetsNames } from './widgetsNames';
import { customPreload } from './customPreload';
import { getResponse } from 'evolution-common/lib/utils/helpers';

export const currentSectionName: string = 'cars';
const previousSectionName: SectionConfig['previousSection'] = 'household';
const nextSectionName: SectionConfig['nextSection'] = 'addresses';

// Config for the section
export const sectionConfig: SectionConfig = {
    previousSection: previousSectionName,
    nextSection: nextSectionName,
    title: {
        fr: 'Voitures',
        en: 'Cars'
    },
    navMenu: {
        type: 'inNav',
        menuName: {
            fr: 'Voitures',
            en: 'Cars'
        }
    },
    widgets: widgetsNames,
    // Do some actions before the section is loaded
    preload: customPreload,
    // Allow to click on the section menu
    enableConditional: function (interview) {
        return isSectionCompleted({ interview, sectionName: previousSectionName });
    },
    // Allow to click on the section menu
    completionConditional: function (interview) {
        return isSectionCompleted({ interview, sectionName: currentSectionName });
    },
    // Skip this section if the number of cars is zero
    isSectionVisible: (interview, _iterationContext) => {
        const carNumber = getResponse(interview, 'household.carNumber', 0) as number;
        return carNumber !== 0;
    }
};

export default sectionConfig;
