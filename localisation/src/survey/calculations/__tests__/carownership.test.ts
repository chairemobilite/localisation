import { predictCarOwnership } from '../carownership';

describe('predictCarOwnership', () => {
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
