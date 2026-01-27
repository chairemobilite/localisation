/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Vehicle } from '../types';
import { getVehicleNickname } from '../customHelpers';

let currentLanguage: string = '';

const changeLanguage = (language: string) => {
    currentLanguage = language;
}

// Mock i18next
jest.mock('i18next', () => ({
    t: jest.fn((key: string, params: any) => {
        const translations: {[index: string]: { [index: string]: string }} = {
            'fr' : {
                'localisation:cars:numberedCar': `Voiture ${params.number}`
            },
            'en' : {
                'localisation:cars:numberedCar': `Car ${params.number}`
            },
        };
        return translations[currentLanguage][key] || key;
    })
}));

describe.each([
    ['fr'],
    ['en']
])('getVehicleName in language %s', (language) => {

    beforeEach(() => {
        changeLanguage(language);
    });

    test(`Car with regular nickname, in language ${language}`, () => {
        const car: Vehicle = {
            _sequence: 1,
            _uuid: 'uuid1',
            nickname: 'My Ferrari'
        };

        const nickname = getVehicleNickname(car);
        expect(nickname).toBe('My Ferrari');
    });

    test(`Car with undefined nickname, in language ${language}`, () => {
        const car: Vehicle = {
            _sequence: 2,
            _uuid: 'uuid2'
        };

        const nickname = getVehicleNickname(car);
        expect(nickname).toBe(language === 'fr' ? 'Voiture 2' : 'Car 2');
    });

    test(`Car with empty nickname, in language ${language}`, () => {
        const car: Vehicle = {
            _sequence: 3,
            _uuid: 'uuid3',
            nickname: '   '
        };

        const nickname = getVehicleNickname(car);
        expect(nickname).toBe(language === 'fr' ? 'Voiture 3' : 'Car 3');
    });

})