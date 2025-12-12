/**
 * Type for housing locations
 *
 * TODO Rename a few fields to clarify their meaning/frequency
 */
export type Address = {
    _sequence: number;
    _uuid: string;
    name?: string;
    geography?: GeoJSON.Feature<GeoJSON.Point>;
    // FIXME Make sure the type of the following are correct, number vs string
    ownership?: 'rent' | 'buy';
    // Monthly  rent amount
    rentMonthly?: number;
    // Whether utilities are included in the rent
    areUtilitiesIncluded?: boolean;
    // Total amount to pay
    mortgage?: number;
    // Yearly interest rate as a percentage
    interestRate?: number;
    // Amortization period in years
    amortizationPeriodInYears?: string;
    // Yearly property taxes
    taxesYearly?: number;
    // Monthly utilities cost
    utilitiesMonthly?: number;
    monthlyCost?: CalculationResults;
    accessibilityMap?: GeoJSON.FeatureCollection<GeoJSON.MultiPolygon> | null;
    routingTimeDistances?: {
        [destinationUuid: string]: RoutingByModeDistanceAndTime | null;
    } | null;
};

export type TimeAndDistance = {
    _uuid: string; // Should be the mode as expected by group widgets
    _sequence: number;
    distanceMeters: number;
    travelTimeSeconds: number;
};

export type RoutingByModeDistanceAndTime = {
    // Fields required for all objects in groups
    _uuid: string;
    _sequence: number;
    resultsByMode: {
        walking: TimeAndDistance | null;
        cycling: TimeAndDistance | null;
        driving: TimeAndDistance | null;
        transit: TimeAndDistance | null;
    };
};

export type Destination = {
    _sequence: number;
    _uuid: string;
    name?: string;
    geography?: GeoJSON.Feature<GeoJSON.Point>;
    frequencyWeekly?: string;
};

// FIXME These enums should be for the backend only, the frontend categories
// could be different from calculation ones, so we can map them when needed
export enum CarCategory {
    PassengerCar = 'passengerCar',
    LuxuryCar = 'luxuryCar',
    Pickup = 'pickup',
    Suv = 'suv',
    Other = 'other'
}

// FIXME These enums should be for the backend only, the frontend engines could
// be different, so we can map them when needed
export enum CarEngine {
    Electric = 'electric',
    PluginHybrid = 'pluginHybrid',
    Hybrid = 'hybrid',
    Gas = 'gas'
}

export type Vehicle = {
    _sequence: number;
    _uuid: string;
    nickname?: string;
    category?: CarCategory;
    engineType?: CarEngine;
};

export type CalculationResults = {
    /** Monthly cost for housing. Can be null if there is missing information */
    housingCostMonthly: number | null;
    /** Percentage of income spent on housing. Can be null if there is missing information */
    housingCostPercentageOfIncome: number | null;
    /** Monthly cost for car possession. Can be null if there is missing information or errors */
    carCostMonthly: number | null;
    /** Precomputed total, only if both housing and car costs are available, null otherwise */
    totalCostMonthly: number | null;
};
