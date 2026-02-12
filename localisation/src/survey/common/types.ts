import type { AccessibilityMapPolygonProperties } from 'evolution-backend/lib/services/routing/types';

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
    monthlyCost?: CostsCalculationResults;
    accessibilityMapsByMode?:
        | {
              walking: AddressAccessibilityMapsDurations | null;
              cycling: AddressAccessibilityMapsDurations | null;
              driving: AddressAccessibilityMapsDurations | null;
              transit: AddressAccessibilityMapsDurations | null;
          }
        | null
        | 'calculating';
    routingTimeDistances?:
        | {
              [destinationUuid: string]: RoutingByModeDistanceAndTime | null;
          }
        | null
        | 'calculating';
};

export type AddressAccessibilityMapsDurations = {
    duration15Minutes: GeoJSON.Feature<GeoJSON.MultiPolygon, AccessibilityMapPolygonProperties> | null;
    duration30Minutes: GeoJSON.Feature<GeoJSON.MultiPolygon, AccessibilityMapPolygonProperties> | null;
    duration45Minutes: GeoJSON.Feature<GeoJSON.MultiPolygon, AccessibilityMapPolygonProperties> | null;
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

export type CostsCalculationResults = {
    /** Monthly cost for housing. Can be null if there is missing information */
    housingCostMonthly: number | null;
    /** Percentage of income spent on housing and transport. Can be null if there is missing information */
    housingAndTransportCostPercentageOfIncome: number | null;
    /** Monthly cost for car possession. Can be null if there is missing information or errors */
    carCostMonthly: number | null;
    /** Precomputed total, only if both housing and car costs are available, null otherwise */
    totalCostMonthly: number | null;
    /** Current number of vehicles in the household. Can be null if there is missing information */
    currentNumberOfVehicles: number | null;
    /** Predicted number of vehicles in the household. Can be null if it was not possible to predict */
    predictedNumberOfVehicles: number | null;
};

// Type for the destination result object in the results template
export type DestinationResult = {
    homeAddressUuid: string;
    destinationAddressUuid: string;
    mode: 'walking' | 'cycling' | 'driving' | 'transit';
    distanceMeters?: number;
    travelTimeSeconds?: number;
};

/**
 * Accessibility panel attributes for filtering and displaying accessibility maps.
 * All properties are optional to allow for partial data during runtime.
 */
export type AccessibilityPanelAttrs = {
    selectedLocation?: 'both' | 'first' | 'second';
    selectedTravelTime?: '15' | '30' | '45';
    selectedMode?: 'walking' | 'cycling' | 'transit';
};
