import _isEmpty from 'lodash/isEmpty';
import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import customPreloadBase from '../../common/customPreloadBase';
import { currentSectionName } from './sectionConfigs';

export const customPreload: SectionConfig['preload'] = function (
    interview,
    { startUpdateInterview, startAddGroupedObjects, startRemoveGroupedObjects, callback }
) {
    const responsesContent = customPreloadBase(interview, currentSectionName);

    const groupedObjects = getResponse(interview, 'cars');
    const groupedObjectIds = groupedObjects ? Object.keys(groupedObjects) : [];
    const carNumber = getResponse(interview, 'household.carNumber', 0) as number;
    const carNumberIsValid = !isNaN(Number(carNumber)) && carNumber >= 0 && carNumber <= 13;

    const emptyGroupedObjects = groupedObjectIds.filter((groupedObjectId) => {
        const { _uuid, _sequence, ...restOfGroup } = groupedObjects[groupedObjectId];
        return _isEmpty(restOfGroup);
    });

    if (carNumberIsValid && carNumber) {
        responsesContent['response.household._carInfoCount'] = groupedObjectIds.length;
        if (groupedObjectIds.length < carNumber) {
            // auto create objects according to number of cars:
            startAddGroupedObjects(carNumber - groupedObjectIds.length, -1, 'cars', null, (_interview) => {
                responsesContent['response.household._carInfoCount'] = carNumber;
                startUpdateInterview(
                    { sectionShortname: currentSectionName, valuesByPath: responsesContent },
                    callback
                );
            });
        } else if (groupedObjectIds.length > carNumber) {
            const pathsToDelete = [];
            // auto remove empty objects according to number of cars:
            for (let i = 0; i < groupedObjectIds.length; i++) {
                if (emptyGroupedObjects[i]) {
                    pathsToDelete.push(`cars.${emptyGroupedObjects[i]}`);
                }
            }
            if (pathsToDelete.length > 0) {
                startRemoveGroupedObjects(pathsToDelete, (_interview) => {
                    responsesContent['response.household._carInfoCount'] =
                        groupedObjectIds.length - pathsToDelete.length;
                    startUpdateInterview(
                        { sectionShortname: currentSectionName, valuesByPath: responsesContent },
                        callback
                    );
                });
            } else {
                responsesContent['response.household._carInfoCount'] = groupedObjectIds.length;
                startUpdateInterview(
                    { sectionShortname: currentSectionName, valuesByPath: responsesContent },
                    callback
                );
            }
        } else {
            responsesContent['response.household._carInfoCount'] = groupedObjectIds.length;
            startUpdateInterview({ sectionShortname: currentSectionName, valuesByPath: responsesContent }, callback);
        }
    } else {
        startUpdateInterview({ sectionShortname: currentSectionName, valuesByPath: responsesContent }, callback);
    }
    return null;
};
