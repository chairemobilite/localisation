/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import * as ort from 'onnxruntime-node';
import path from 'path';

import zonesQueries from 'chaire-lib-backend/lib/models/db/zones.db.queries';

const MODEL_FILENAME = path.resolve(__dirname, '../../../models/xgb_car_ownership_model.onnx');

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
    income: number;
}): Promise<number> {
    // Fetch proximity indexes
    const proximityIndexes = await getProximityIndexes(data.geography);

    if (proximityIndexes === null) {
        throw new Error('Input point is not within any of the imported zones.');
    }

    // TODO
    // Map income to income range of the model
    // This is what was used for the model:
    //     income_mapping = {
    //    "Less than $10,000": 1,
    //    "$10,000 to $19,999": 1,
    //    "$20,000 to $29,999": 1,
    //    "$30,000 to $39,999": 2,
    //    "$40,000 to $49,999": 2,
    //    "$50,000 to $59,999": 2,
    //    "$60,000 to $69,999": 3,
    //    "$70,000 to $79,999": 3,
    //    "$80,000 to $89,999": 3,
    //    "$90,000 to $99,999": 4,
    //    "$100,000 to $149,999": 5,
    //    "$150,000 to $199,999": 6,
    //    "$200,000 and more": 8,
    //    "I don't know": 10,
    //    "I prefer not to answer": 9,
    //}
    const incomeLevel = 2;

    // TODO ensure that numberPermits is not higher than householdSize

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
