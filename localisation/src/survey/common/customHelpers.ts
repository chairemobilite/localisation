/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import i18n from 'i18next';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { getResponse } from 'evolution-common/lib/utils/helpers';
import { Address, Destination, Vehicle } from './types';

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

/**
 * Get the vehicles array for an interview, or an empty array if there are no
 * vehicles for this interview.
 * @param {UserInterviewAttributes} interview The interview for which to get the
 * vehicles
 * @returns The array of vehicles sorted by sequence, or an empty array if none
 * exist.
 */
export const getVehiclesArray = function (interview: UserInterviewAttributes): Vehicle[] {
    // FIXME Rename the cars path to vehicles
    const vehicles = getResponse(interview, 'cars', {});
    // Make sure to filter out any invalid vehicle entries
    return Object.values(vehicles)
        .filter((v): v is Vehicle => v && typeof v === 'object' && typeof (v as any)._sequence === 'number')
        .sort((vehicleA, vehicleB) => vehicleA._sequence - vehicleB._sequence);
};

/**
 * Get the user defined nickname of the vehicle. If there is none, return a numbered label that will change dynamically based on the current language.
 * @param {Vehicle} car The car we want to get the nickname of.
 * @returns The car's nickname, or a dynamically generated label if it doesn't have one.
 */
export const getVehicleNickname = function (car: Vehicle): string {
    const nickname = car.nickname?.trim();
    return nickname || i18n.t('localisation:cars:numberedCar', { number: car._sequence });
};
