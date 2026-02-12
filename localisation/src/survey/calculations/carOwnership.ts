/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import * as ort from 'onnxruntime-node';
import path from 'path';

import zonesQueries from 'chaire-lib-backend/lib/models/db/zones.db.queries';

const MODEL_FILENAME = path.resolve(__dirname, '../../models/xgb_car_ownership_model.onnx');

// Load session as a Singleton so that we don't have to lead it each time we run the function
let session: ort.InferenceSession | null = null;

async function getSession(): Promise<ort.InferenceSession> {
    if (!session) {
        session = await ort.InferenceSession.create(MODEL_FILENAME);
    }
    return session;
}

interface ProximityIndexes {
    idx_prox_emp: ort.Tensor;
    idx_prox_pharma: ort.Tensor;
    idx_prox_garderie: ort.Tensor;
    idx_prox_sante: ort.Tensor;
    idx_prox_epicerie: ort.Tensor;
    idx_prox_educpri: ort.Tensor;
    idx_prox_educsec: ort.Tensor;
    idx_prox_bibl: ort.Tensor;
    idx_prox_parcs: ort.Tensor;
    idx_prox_transit: ort.Tensor;
}

// Mapping of income choices to model levels
export const INCOME_CHOICE_TO_MODEL_LEVEL: Record<string, number> = {
    '000000_009999': 1, // Less than $10,000
    '010000_019999': 1, // $10,000 to $19,999
    '020000_029999': 1, // $20,000 to $29,999
    '030000_039999': 2, // $30,000 to $39,999
    '040000_049999': 2, // $40,000 to $49,999
    '050000_059999': 2, // $50,000 to $59,999
    '060000_069999': 3, // $60,000 to $69,999
    '070000_079999': 3, // $70,000 to $79,999
    '080000_089999': 3, // $80,000 to $89,999
    '090000_099999': 4, // $90,000 to $99,999
    '100000_119999': 4, // $100,000 to $119,999
    '120000_149999': 5, // $120,000 to $149,999
    '150000_179999': 6, // $150,000 to $179,999
    '180000_209999': 7, // $180,000 to $209,999
    '210000_999999': 8, // $210,000 and more
    dontKnow: 10, // I don't know
    refusal: 9 // I prefer not to answer
};

// Map income to model income level
export function mapIncomeToModelIncomeLevel(income: string): number {
    const trimmedIncome = income.trim();
    const mappedLevel = INCOME_CHOICE_TO_MODEL_LEVEL[trimmedIncome];
    if (mappedLevel !== undefined) {
        return mappedLevel;
    }

    // Fallback to support direct numeric income values if ever provided.
    const numericIncome = Number(trimmedIncome);
    if (Number.isFinite(numericIncome)) {
        if (numericIncome < 30000) {
            return 1;
        } else if (numericIncome < 60000) {
            return 2;
        } else if (numericIncome < 90000) {
            return 3;
        } else if (numericIncome < 120000) {
            return 4;
        } else if (numericIncome < 150000) {
            return 5;
        } else if (numericIncome < 180000) {
            return 6;
        } else if (numericIncome < 210000) {
            return 7;
        }
        return 8;
    }

    // Unknown format: treat as "don't know" instead of failing.
    console.error('Unknown income format:', income);
    return 10;
}

async function getProximityIndexes(geography: GeoJSON.Feature<GeoJSON.Point>): Promise<ProximityIndexes | null> {
    // We assume there is only one data source for the zones, and that they all have the indexes as data.
    const zones = await zonesQueries.getZonesContaining(geography);

    if (zones.length === 0) {
        return null;
    }

    // TODO: Check if it is possible for a point to return more than one zone. For now, we assume no and we just take the first one.
    const zoneData = zones[0].data;

    const tensor = (value: number) => new ort.Tensor('float32', Float32Array.from([value]), [1, 1]);

    return {
        idx_prox_emp: tensor(Number(zoneData.prox_idx_emp ?? 0)),
        idx_prox_pharma: tensor(Number(zoneData.prox_idx_pharma ?? 0)),
        idx_prox_garderie: tensor(Number(zoneData.prox_idx_childcare ?? 0)),
        idx_prox_sante: tensor(Number(zoneData.prox_idx_health ?? 0)),
        idx_prox_epicerie: tensor(Number(zoneData.prox_idx_grocery ?? 0)),
        idx_prox_educpri: tensor(Number(zoneData.prox_idx_educpri ?? 0)),
        idx_prox_educsec: tensor(Number(zoneData.prox_idx_educsec ?? 0)),
        idx_prox_bibl: tensor(Number(zoneData.prox_idx_lib ?? 0)),
        idx_prox_parcs: tensor(Number(zoneData.prox_idx_parks ?? 0)),
        idx_prox_transit: tensor(Number(zoneData.prox_idx_transit ?? 0))
    };
}

export async function predictCarOwnership(data: {
    geography: GeoJSON.Feature<GeoJSON.Point>;
    householdSize: number;
    numberPermits: number;
    income: string;
}): Promise<number> {
    // Fetch proximity indexes
    const proximityIndexes = await getProximityIndexes(data.geography);

    if (proximityIndexes === null) {
        throw new Error('Input point is not within any of the imported zones.');
    }

    // Map income to model income level
    const incomeLevel = mapIncomeToModelIncomeLevel(data.income);

    // Ensure that numberPermits is not higher than householdSize
    if (data.numberPermits > data.householdSize) {
        throw new Error('Number of permits is higher than household size');
    }

    const session = await getSession();

    const inputs: Record<string, ort.Tensor> = {
        perslogi: new ort.Tensor('float32', Float32Array.from([data.householdSize]), [1, 1]),
        nbPermis: new ort.Tensor('float32', Float32Array.from([data.numberPermits]), [1, 1]),
        revenu: new ort.Tensor('string', [String(incomeLevel)], [1, 1]),
        ...proximityIndexes
    };

    const results = await session.run(inputs);

    if (!results.label?.data?.length) {
        throw new Error('Car Ownership Model returned invalid label');
    }

    const carPrediction = Number(results.label.data[0]);
    if (Number.isNaN(carPrediction)) {
        throw new Error(`Invalid car prediction value: ${results.label.data[0]}`);
    }

    return carPrediction;
}
