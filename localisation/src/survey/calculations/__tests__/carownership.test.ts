import { predictCarOwnership } from '../carOwnership';

import zonesQueries from 'chaire-lib-backend/lib/models/db/zones.db.queries';

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
const mockGetZonesContaining = zonesQueries.getZonesContaining as jest.MockedFunction<any>;


describe('predictCarOwnership with returned values', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetZonesContaining.mockResolvedValue([{data: mockedIndexes}]);
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
            income: 75000,
        });

        expect(typeof result).toBe('number');
        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(0);
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
            income: 50000,
        };

        const result1 = await predictCarOwnership(data);
        const result2 = await predictCarOwnership(data);

        expect(result1).toBe(result2);
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
            income: 50000,
        };

        const data2 = {
            geography: {
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [-73.5674, 45.5019] },
                properties: {},
            },
            householdSize: 7,
            numberPermits: 7,
            income: 50000,
        };

        const result1 = await predictCarOwnership(data);
        const result2 = await predictCarOwnership(data2);

        expect(result1).not.toBe(result2);
    });
});

describe('predictCarOwnership with thrown errors', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetZonesContaining.mockResolvedValue([]);
    });

    it('should throw if getProximityIndexes returns empty array', async () => {
        const data = {
            geography: {
                type: 'Feature' as const,
                geometry: { type: 'Point' as const, coordinates: [-73.5674, 45.5019] },
                properties: {},
            },
            householdSize: 2,
            numberPermits: 1,
            income: 50000,
        };

        await expect(predictCarOwnership(data)).rejects.toThrow('Input point is not within any of the imported zones.');
    });
});
