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
    rent?: number;
    // Whether utilities are included in the rent
    areUtilitiesIncluded?: boolean;
    // Total amount to pay
    mortgage?: number;
    // Yearly interest rate as a percentage
    interestRate?: number;
    // Amortization period in years
    amortizationPeriod?: string;
    // Yearly property taxes
    taxes?: number;
    // Monthly utilities cost
    utilities?: number;
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
    frequency?: string;
};

export type CalculationResults = {
    /** Monthly cost for housing. Can be null if there is missing information */
    housingCostMonthly: number | null;
    /** Percentage of income spent on housing. Can be null if there is missing information */
    housingCostPercentageOfIncome: number | null;
};
