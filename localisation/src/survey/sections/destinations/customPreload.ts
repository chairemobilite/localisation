import _isEmpty from 'lodash/isEmpty';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import customPreloadBase from '../../common/customPreloadBase';
import { currentSectionName } from './sectionConfigs';

const DESTINATION_NUMBER = 2; // The number of frequent destinations we want to input. For now, we can keep it at 2.

export const customPreload: SectionConfig['preload'] = function (
    interview,
    { startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback }
) {
    const responsesContent = customPreloadBase(interview, currentSectionName);

    const groupedObjects = getResponse(interview, 'destinations');
    const groupedObjectIds = groupedObjects ? Object.keys(groupedObjects) : [];

    const emptyGroupedObjects = groupedObjectIds.filter((groupedObjectId) => {
        const { _uuid, _sequence, ...restOfGroup } = groupedObjects[groupedObjectId];
        return _isEmpty(restOfGroup);
    });

    if (groupedObjectIds.length < DESTINATION_NUMBER) {
        // auto create objects according to number of destinations:
        startAddGroupedObjects(DESTINATION_NUMBER - groupedObjectIds.length, -1, 'destinations', null, (_interview) => {
            startUpdateInterview({ sectionShortname: currentSectionName, valuesByPath: responsesContent }, callback);
        });
    } else if (groupedObjectIds.length > DESTINATION_NUMBER) {
        const pathsToDelete = [];
        // auto remove empty objects according to number of destinations:
        for (let i = 0; i < groupedObjectIds.length; i++) {
            if (emptyGroupedObjects[i]) {
                pathsToDelete.push(`destinations.${emptyGroupedObjects[i]}`);
            }
        }
        if (pathsToDelete.length > 0) {
            startRemoveGroupedObjects(pathsToDelete, (_interview) => {
                startUpdateInterview(
                    { sectionShortname: currentSectionName, valuesByPath: responsesContent },
                    callback
                );
            });
        } else {
            startUpdateInterview({ sectionShortname: currentSectionName, valuesByPath: responsesContent }, callback);
        }
    } else {
        startUpdateInterview({ sectionShortname: currentSectionName, valuesByPath: responsesContent }, callback);
    }
    return null;
};
