import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { Address, Destination } from './types';

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

/**
 * Get the addresses array for an interview, or an empty array if there are no
 * addresses for this interview.
 *
 * @param {UserInterviewAttributes} interview The interview for which to get the addresses
 * @returns {Address[]} The array of addresses sorted by sequence, or an empty array if none exist.
 */
export const getAddressesArray = function (interview: UserInterviewAttributes): Address[] {
    const addresses = getResponse(interview, 'addresses', {});
    return Object.values(addresses).sort((addressA, addressB) => addressA._sequence - addressB._sequence);
};

/**
 * Get the frequent destinations for an interview. It will return an empty
 * object if no destinations are defined.
 *
 * @param {UserInterviewAttributes} interview The interview for which to get the
 * destinations
 * @returns {{ [destinationUuid: string]: Destination }} An object with
 * destination UUIDs as keys and Destination objects as values.
 */
export const getFrequentDestinations = function (interview: UserInterviewAttributes): {
    [destinationUuid: string]: Destination;
} {
    return getResponse(interview, 'destinations', {}) as { [destinationUuid: string]: Destination };
};

/**
 * Get the destinations array for an interview, or an empty array if there are no
 * destinations for this interview.
 *
 * @param {UserInterviewAttributes} interview The interview for which to get the destinations
 * @returns {Destination[]} The array of destinations sorted by sequence, or an empty array if none exist.
 */
export const getDestinationsArray = function (interview: UserInterviewAttributes): Destination[] {
    const destinations = getFrequentDestinations(interview);
    return Object.values(destinations).sort(
        (destinationA, destinationB) => destinationA._sequence - destinationB._sequence
    );
};
