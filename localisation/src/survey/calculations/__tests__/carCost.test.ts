/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */


import { CarCategory, CarEngine } from '../../common/types';
import { carCostAverageCaa } from '../carCost';

describe('carCostAverageCaa', () => {
    describe('valid combinations', () => {
        it('should return correct cost for PassengerCar + Electric', () => {
            expect(carCostAverageCaa(CarCategory.PassengerCar, CarEngine.Electric)).toBeCloseTo(5947.69);
        });

        it('should return correct cost for PassengerCar + PluginHybrid', () => {
            expect(carCostAverageCaa(CarCategory.PassengerCar, CarEngine.PluginHybrid)).toBeCloseTo(7484.73);
        });

        it('should return correct cost for PassengerCar + Hybrid', () => {
            expect(carCostAverageCaa(CarCategory.PassengerCar, CarEngine.Hybrid)).toBeCloseTo(7539.17);
        });

        it('should return correct cost for PassengerCar + Gas', () => {
            expect(carCostAverageCaa(CarCategory.PassengerCar, CarEngine.Gas)).toBeCloseTo(9399.17);
        });

        it('should return correct cost for LuxuryCar + Gas', () => {
            expect(carCostAverageCaa(CarCategory.LuxuryCar, CarEngine.Gas)).toBeCloseTo(16252.59);
        });

        it('should return correct cost for Pickup + Electric', () => {
            expect(carCostAverageCaa(CarCategory.Pickup, CarEngine.Electric)).toBeCloseTo(10440.29);
        });

        it('should return correct cost for Suv + PluginHybrid', () => {
            expect(carCostAverageCaa(CarCategory.Suv, CarEngine.PluginHybrid)).toBeCloseTo(7175.75);
        });
    });

    describe('invalid combinations', () => {
        it('should throw error for Pickup + PluginHybrid (no data available)', () => {
            expect(() => carCostAverageCaa(CarCategory.Pickup, CarEngine.PluginHybrid))
                .toThrow('No data available for pickup + pluginHybrid');
        });
    });
});
