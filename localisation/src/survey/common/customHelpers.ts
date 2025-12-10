import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';

export const countCars = ({ interview }: { interview: UserInterviewAttributes }): number => {
    const carIds = getResponse(interview, 'cars', {});
    return Object.keys(carIds).length;
};

export const getCurrentCarId = ({
    interview,
    path
}: {
    interview: UserInterviewAttributes;
    path?: string;
}): string | null => {
    // 1. Try to extract personId from path if it matches cars.{personId}.
    // Note that despite being cars, internally this is hard coded to personId
    if (path) {
        const match = path.match(/cars\.([^.]+)\./);
        if (match) {
            return match[1];
        }
    }
    // 2. Otherwise, use the active person id from the interview response
    return interview.response._activePersonId ?? null;
};

export const getCurrentAddressId = ({
    interview,
    path
}: {
    interview: UserInterviewAttributes;
    path?: string;
}): string | null => {
    // 1. Try to extract address id from path if it matches addresses.{addressId}.
    // Note that despite being addresses/houses, internally this is hard coded to personId
    if (path) {
        const match = path.match(/addresses\.([^.]+)\./);
        if (match) {
            return match[1];
        }
    }
    // 2. Otherwise, use the active person id from the interview response
    return interview.response._activePersonId ?? null;
};
