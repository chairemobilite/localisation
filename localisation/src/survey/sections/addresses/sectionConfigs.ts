import { isSectionCompleted } from 'evolution-common/lib/services/questionnaire/sections/navigationHelpers';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { widgetsNames } from './widgetsNames';
import { customPreload } from './customPreload';

export const currentSectionName: string = 'addresses';
const previousSectionName: SectionConfig['previousSection'] = 'cars';
const nextSectionName: SectionConfig['nextSection'] = 'destinations';

// Config for the section
export const sectionConfig: SectionConfig = {
    previousSection: previousSectionName,
    nextSection: nextSectionName,
    title: {
        fr: 'Adresses',
        en: 'Addresses'
    },
    navMenu: {
        type: 'inNav',
        menuName: {
            fr: 'Adresses',
            en: 'Addresses'
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
