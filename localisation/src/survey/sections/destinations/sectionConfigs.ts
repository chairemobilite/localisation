import { isSectionCompleted } from 'evolution-common/lib/services/questionnaire/sections/navigationHelpers';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { widgetsNames } from './widgetsNames';
import { customPreload } from './customPreload';

export const currentSectionName: string = 'destinations';
const previousSectionName: SectionConfig['previousSection'] = 'addresses';
const nextSectionName: SectionConfig['nextSection'] = 'results';

// Config for the section
export const sectionConfig: SectionConfig = {
    previousSection: previousSectionName,
    nextSection: nextSectionName,
    title: {
        fr: 'Destinations fréquentes',
        en: 'Frequent destinations'
    },
    navMenu: {
        type: 'inNav',
        menuName: {
            fr: 'Destinations fréquentes',
            en: 'Frequent destinations'
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
