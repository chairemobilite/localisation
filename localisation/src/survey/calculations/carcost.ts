/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { CarCategory, CarEngine } from '../common/types';

/* Calculated average from CAA data. Will need to be done properly
   Was scraped from their website. Average were calculated from a subset of the
   data taken at an unknown date. An AI agent parsed the 2019 et 2022 model list
   and generated these averages.
 */
export const averageAnnualCarCost: Record<CarCategory, Partial<Record<CarEngine, number>>> = {
    [CarCategory.PassengerCar]: {
        [CarEngine.Electric]: 5947.69,
        [CarEngine.PluginHybrid]: 7484.73,
        [CarEngine.Hybrid]: 7539.17,
        [CarEngine.Gas]: 9399.17
    },
    [CarCategory.LuxuryCar]: {
        [CarEngine.Electric]: 13060.87,
        [CarEngine.PluginHybrid]: 15433.43,
        [CarEngine.Hybrid]: 11478.78,
        [CarEngine.Gas]: 16252.59
    },
    [CarCategory.Pickup]: {
        [CarEngine.Electric]: 10440.29,
        [CarEngine.Hybrid]: 13034.54,
        [CarEngine.Gas]: 11915.5
    },
    [CarCategory.Suv]: {
        [CarEngine.Electric]: 6432.82,
        [CarEngine.PluginHybrid]: 7175.75,
        [CarEngine.Hybrid]: 7831.03,
        [CarEngine.Gas]: 9907.93
    },
    // No data for other types of vehicles
    [CarCategory.Other]: {}
};

/* Compute car cost based on average per type. This is based on data from CAA.

   We consider engine type (electric, hybrid, gas, etc) and common types

   @return {number} Annual cost of the vehicle
 */
export function carCostAverageCaa(category: CarCategory, engine: CarEngine): number {
    const cost = averageAnnualCarCost[category]?.[engine];
    if (cost === undefined) {
        // TODO Evaluate if we would prefer instead to fall back on the gas engine for that category
        throw new Error(`No data available for ${category} + ${engine}`);
    }
    return cost;
}
