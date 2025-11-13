import { SectionConfig } from "evolution-common/lib/services/questionnaire/types";

export const customPreload: SectionConfig['preload'] = function (
    interview,
    { startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback }
) {
    // FIXME The generate still needs the customPreload function, but it is not
    // required anymore. Remove once generate is updated.
    // The callback absolutely needs to be called though
    callback(interview);
};