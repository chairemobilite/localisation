import { isSectionCompleted } from 'evolution-common/lib/services/questionnaire/sections/navigationHelpers';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { widgetsNames } from './widgetsNames';
import { customPreload } from './customPreload';

export const currentSectionName: string = 'results';
const previousSectionName: SectionConfig['previousSection'] = 'destinations';
const nextSectionName: SectionConfig['nextSection'] = null;

// Config for the section
export const sectionConfig: SectionConfig = {
    previousSection: previousSectionName,
    nextSection: nextSectionName,
    title: {
        fr: 'Résultats',
        en: 'Results'
    },
    navMenu: {
        type: 'inNav',
        menuName: {
            fr: 'Résultats',
            en: 'Results'
        }
    },
    template: 'results',
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
    }
};

export default sectionConfig;
