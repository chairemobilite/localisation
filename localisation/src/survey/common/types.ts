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
    amortizationPeriod?: number;
    // Yearly property taxes
    taxes?: number;
    // Monthly utilities cost
    utilities?: number;
};

export type Destination = {
    _sequence: number;
    _uuid: string;
    name?: string;
    geography?: GeoJSON.Feature<GeoJSON.Point>;
    frequency?: string;
};
