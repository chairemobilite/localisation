import { predictCarOwnership } from '../carOwnership';

import zonesQueries from 'chaire-lib-backend/lib/models/db/zones.db.queries';
import * as Status from 'chaire-lib-common/lib/utils/Status';

const mockedIndexes = {
    prox_idx_emp: 1,
    prox_idx_pharma: 0.5,
    prox_idx_childcare: null,
    prox_idx_health: 0.1,
    prox_idx_grocery: 0.9,
    prox_idx_educpri: 0.8,
    prox_idx_educsec: 1,
    prox_idx_lib: null,
    prox_idx_parks: 0.2,
    prox_idx_transit: 0.3
};

jest.mock('chaire-lib-backend/lib/models/db/zones.db.queries', () => ({
    getZonesContaining: jest.fn()
}));
const mockGetZonesContaining = zonesQueries.getZonesContaining as jest.MockedFunction<
    typeof zonesQueries.getZonesContaining
>;


describe('predictCarOwnership with returned values', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockGetZonesContaining.mockResolvedValue([{ data: mockedIndexes }] as any);
    });

    it('should return a number prediction', async () => {
        const result = await predictCarOwnership({
            geography: {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [-73.5674, 45.5019] },
                properties: {},
            },
            householdSize: 3,
            numberPermits: 2,
            income: '060000_069999',
        });

        expect(Status.isStatusOk(result)).toBe(true);
        expect(Number.isInteger(Status.unwrap(result))).toBe(true);
        expect(Status.unwrap(result)).toBeGreaterThanOrEqual(0);
    });

    it('should return consistent results for same inputs', async () => {
        const data = {
            geography: {
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [-73.5674, 45.5019] },
                properties: {},
            },
            householdSize: 2,
            numberPermits: 1,
            income: '030000_039999',
        };

        const result1 = await predictCarOwnership(data);
        const result2 = await predictCarOwnership(data);

        expect(Status.isStatusOk(result1)).toBe(true);
        expect(Status.isStatusOk(result2)).toBe(true);
        expect(Status.unwrap(result1)).toBe(Status.unwrap(result2));
    });

    it('should return different results for vastly different inputs', async () => {
        // We craft data that we know will return different number of car owned.
        const data = {
            geography: {
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [-73.5674, 45.5019] },
                properties: {},
            },
            householdSize: 2,
            numberPermits: 1,
            income: '030000_039999',
        };

        const data2 = {
            geography: {
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [-73.5674, 45.5019] },
                properties: {},
            },
            householdSize: 7,
            numberPermits: 7,
            income: '210000_999999',
        };

        const result1 = await predictCarOwnership(data); // Should return 1
        const result2 = await predictCarOwnership(data2); // Should return 3

        expect(Status.isStatusOk(result1)).toBe(true);
        expect(Status.isStatusOk(result2)).toBe(true);
        expect(Status.unwrap(result1)).not.toBe(Status.unwrap(result2));
    });
});

describe('predictCarOwnership with thrown errors', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetZonesContaining.mockResolvedValue([]);
    });

    it('should return error status if getProximityIndexes returns empty array', async () => {
        const data = {
            geography: {
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [-73.5674, 45.5019] },
                properties: {},
            },
            householdSize: 2,
            numberPermits: 1,
            income: '030000_039999',
        };

        const result = await predictCarOwnership(data);
        expect(Status.isStatusError(result)).toBe(true);
        expect((result as Status.StatusError).error).toEqual('Input point is not within any of the imported zones.');
    });
});
