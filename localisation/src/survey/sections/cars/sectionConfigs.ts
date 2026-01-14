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
    // Flag the section as completed or not
    completionConditional: function (interview) {
        return isSectionCompleted({ interview, sectionName: currentSectionName });
    }
};

export default sectionConfig;
