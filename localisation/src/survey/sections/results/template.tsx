/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
// import _capitalize from 'lodash/capitalize';
import { Widget } from 'evolution-frontend/lib/components/survey/Widget';
import type { Address, DestinationResult } from 'localisation/src/survey/common/types.ts';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { SectionProps, useSectionTemplate } from 'evolution-frontend/lib/components/hooks/useSectionTemplate';
import { getAddressesArray, getDestinationsArray } from '../../common/customHelpers';

// This matches the structure of Address.routingTimeDistances
type RoutingTimeDistances = Address['routingTimeDistances'];

// Helper function to format currency values
const formatCurrency = (value: number | string | undefined | null): string => {
    if (value === undefined || value === null || value === 'N/A') {
        return value === 'N/A' ? 'N/A' : '0 $';
    }
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
        return '0 $';
    }
    // Round to integer (no decimals)
    const integerValue = Math.round(numValue);
    // Format with space as thousands separator
    const formatted = integerValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} $`;
};

// Helper function to format time from seconds to minutes
const formatTime = (seconds: number | undefined | null): string => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) {
        return 'N/A';
    }
    const minutes = Math.round(seconds / 60);
    return `${minutes} min.`;
};

// Helper function to format distance from meters to kilometers
const formatDistance = (meters: number | undefined): string => {
    if (meters === undefined || meters === null || isNaN(meters)) {
        return 'N/A';
    }
    const kilometers = meters / 1000;
    return `${kilometers.toFixed(1)} km`;
};

// Helper function to get all mode SVGs
const getModeSvgs = (translation: (key: string) => string): Record<string, React.ReactNode> => {
    return {
        transit: (
            <svg
                className="svg-icon-modes-bus_city svg-icon svg-icon-modes"
                xmlns="http://www.w3.org/2000/svg"
                version="1.1"
                viewBox="0 0 800 800"
                role="img"
                aria-label={translation('results:modeNames.transit')}
            >
                <path d="M539.5,745.89v17.951c0,19.8,16.2,36,36,36h43.5c19.8,0,36-16.2,36-36v-17.951h-115.5Z" />
                <path d="M149,745.89v17.951c0,19.8,16.2,36,36,36h43.5c19.8,0,36-16.2,36-36v-17.951h-115.5Z" />
                <path d="M56.498,208.89h-26.498c-16.5,0-30,13.5-30,30v81.475c0,16.5,13.5,30,30,30h26.498v-141.475Z" />
                <path d="M770,208.89h-25.822v141.475h25.822c16.5,0,30-13.5,30-30v-81.475c0-16.5-13.5-30-30-30Z" />
                <path d="M650.895,40.982c0-.008-.002-.015-.002-.022H149.107c0,.008-.002.015-.002.022-42.335,1.912-76.378,37.122-76.378,79.908v529c0,44,36,80,80,80h494.546c44,0,80-36,80-80V120.89c0-42.785-34.043-77.996-76.378-79.908ZM150.793,117.698c0-16.5,13.5-30,30-30h438.413c16.5,0,30,13.5,30,30v12.282c0,16.5-13.5,30-30,30H180.793c-16.5,0-30-13.5-30-30v-12.282ZM162,670.89c-30.376,0-55-24.624-55-55s24.624-55,55-55,55,24.624,55,55-24.624,55-55,55ZM264.5,670.89c-15.188,0-27.5-12.312-27.5-27.5s12.312-27.5,27.5-27.5,27.5,12.312,27.5,27.5-12.312,27.5-27.5,27.5ZM119.01,489.159v-249.384c0-17.992,12.687-32.713,28.193-32.713h505.594c15.506,0,28.193,14.721,28.193,32.713v249.384c0,17.992-128.748,63.731-280.99,63.731s-280.99-45.738-280.99-63.731ZM539.5,670.89c-15.188,0-27.5-12.312-27.5-27.5s12.312-27.5,27.5-27.5,27.5,12.312,27.5,27.5-12.312,27.5-27.5,27.5ZM642,670.89c-30.376,0-55-24.624-55-55s24.624-55,55-55,55,24.624,55,55-24.624,55-55,55Z" />
                <title>{translation('results:modeNames.transit')}</title>
            </svg>
        ),
        walking: (
            <svg
                className="svg-icon-modes-foot svg-icon svg-icon-modes"
                xmlns="http://www.w3.org/2000/svg"
                version="1.1"
                viewBox="0 0 800 800"
                role="img"
                aria-label={translation('results:modeNames.walking')}
            >
                <path d="M445.359,0c39.598,0,71.699,32.1,71.699,71.699s-32.1,71.699-71.699,71.699-71.699-32.1-71.699-71.699S405.76,0,445.359,0Z" />
                <path d="M613.614,342.15s-38.452-10.217-66.582-18.923c-53.236-16.478-73.213-54.906-78.955-96.369-2.971-21.456-12.554-29.014-26.728-36.604-20.963-11.227-61.468-16.692-96.857-9.123-28.224,6.037-99.954,57.282-127.842,75.702-7.214,4.765-12.096,12.331-13.464,20.868l-18.587,110.911c-4.457,22.277,7.932,43.953,30.21,48.412,22.279,4.455,43.953-9.989,48.411-32.269l16.547-86.162c1.533-7.985,6.157-15.042,12.865-19.637l41.296-28.285s-3.831,32.78-12.439,69.49-20.374,93.246,5.973,127.658l-162.88,269.635c-11.138,19.804-4.116,44.886,15.687,56.027,19.802,11.136,44.885,4.114,56.024-15.686l141.449-238.815,161.801,242.698c12.601,18.903,38.144,24.013,57.047,11.412,18.907-12.605,24.013-38.148,11.412-57.051,0,0-150.736-222.919-180.965-271.446l25.127-108.404s13.602,23.81,42.968,32.23c29.366,8.42,97.219,27.877,97.219,27.877,3.553,1.019,7.13,1.505,10.65,1.505,16.768,0,32.202-11.025,37.054-27.947,5.872-20.475-5.967-41.833-26.442-47.704Z" />
                <title>{translation('results:modeNames.walking')}</title>
            </svg>
        ),
        cycling: (
            <svg
                className="svg-icon-modes-bicycle_with_rider svg-icon svg-icon-modes"
                xmlns="http://www.w3.org/2000/svg"
                version="1.1"
                viewBox="0 0 800 800"
                role="img"
                aria-label={translation('results:modeNames.cycling')}
            >
                <path
                    d="M533.3,200c36.8,0,66.7-29.8,66.7-66.7s-29.8-66.7-66.7-66.7-66.7,29.8-66.7,66.7,29.8,66.7,66.7,66.7ZM441.1,183.1c11.1,2.8,20,11,23.6,21.9,6.1,18.2,14.6,34.1,25.1,47.5,28.8,36.8,75.2,57.8,138.2,47.4,15.6-2.6,32.8,7.3,37.8,22.3,6.6,20-6.3,40.4-26.3,43.7-71.6,11.9-133.5-6.3-178.3-46.3l-90.9,79.8,54.4,62.1c5.3,6.1,8.3,13.9,8.3,22.1v150.3c0,15.9-12.8,31.3-28.6,33.6-20.7,2.9-38.4-13-38.4-33.1v-138.2l-68-77.7-1.5-1.7c-8-9-21.4-23.9-27.2-41.7-3.6-10.9-4.7-23.4-.9-36.7,3.7-12.9,11.3-23.8,20.8-33l.5-.4,120.4-113.7c8.3-7.8,20-10.9,31.1-8.1ZM66.7,566.7c0-55.2,44.8-100,100-100s100,44.8,100,100-44.8,100-100,100-100-44.8-100-100ZM166.7,400C74.6,400,0,474.6,0,566.7s74.6,166.7,166.7,166.7,166.7-74.6,166.7-166.7-74.6-166.7-166.7-166.7ZM533.3,566.7c0-55.2,44.8-100,100-100s100,44.8,100,100-44.8,100-100,100-100-44.8-100-100ZM633.3,400c-92,0-166.7,74.6-166.7,166.7s74.6,166.7,166.7,166.7,166.7-74.6,166.7-166.7-74.6-166.7-166.7-166.7Z"
                    fillRule="evenodd"
                />
                <title>{translation('results:modeNames.cycling')}</title>
            </svg>
        ),
        driving: (
            <svg
                className="svg-icon-modes-car_driver_without_passenger svg-icon svg-icon-modes"
                xmlns="http://www.w3.org/2000/svg"
                version="1.1"
                viewBox="0 0 800 800"
                role="img"
                aria-label={translation('results:modeNames.driving')}
            >
                <path d="M757.077,381.465l-11.879-15.416,4.243-1.002c17.798-4.202,28.923-22.202,24.721-40h0c-4.202-17.798-22.202-28.923-40-24.721l-15.091,3.562c-12.329-46.687-27.84-89.564-37.028-108.989-17.913-38.193-53.063-60.837-98.012-66.921-22.645-2.702-96.662-4.731-184.201-4.731s-161.216,2.366-183.862,4.731c-44.95,5.408-80.1,28.729-98.014,66.921-9.147,19.34-24.56,61.924-36.861,108.37l-12.466-2.943c-17.798-4.202-35.798,6.923-40,24.721h0c-4.202,17.798,6.923,35.798,24.721,40l1.883.445-12.31,15.974C11.492,422.023,0,454.13,0,510.911v195.016c0,25.01,19.603,44.275,44.952,44.275h39.881c25.011,0,44.613-19.266,44.613-44.275v-56.781c75.033,4.731,183.524,8.112,270.385,8.112s195.693-3.38,270.723-8.112v56.781c0,25.01,19.264,44.275,44.611,44.275h39.884c25.347,0,44.95-19.266,44.95-44.275v-195.016c0-56.781-11.49-88.888-42.923-129.446ZM139.587,316.573c8.112-37.179,24.335-85.509,35.488-105.113,9.125-15.886,18.927-22.645,37.178-25.011,25.687-3.718,83.145-5.745,187.58-5.745s162.231,1.351,187.918,5.745c17.913,2.704,27.713,9.125,37.176,25.011,11.496,19.264,26.704,67.934,35.487,105.113,3.046,12.504-2.027,17.237-15.206,16.222-12.637-.761-25.827-1.539-40.071-2.288-9.419-28.311-36.142-48.792-67.576-48.792-29.807,0-55.38,18.416-65.979,44.461-21.646-.304-45.41-.477-71.749-.477-122.011,0-188.931,3.718-245.035,7.096-13.182,1.015-17.913-3.718-15.209-16.222ZM487.996,326.437c9.484-17.674,28.141-29.723,49.563-29.723,22.708,0,42.3,13.542,51.161,32.968-28.141-1.343-60.62-2.524-100.724-3.245ZM153.443,569.721c-32.107,0-56.105-24.336-56.105-56.106,0-32.107,23.997-56.105,56.105-56.105s56.105,23.997,56.105,56.105c0,31.77-23.996,56.106-56.105,56.106ZM489.735,554.173h-179.468c-23.658,0-40.22-16.898-40.22-40.558,0-23.996,16.562-40.558,40.22-40.558h179.468c23.66,0,40.22,16.562,40.22,40.558,0,23.66-16.561,40.558-40.22,40.558ZM646.557,569.721c-32.104,0-56.103-24.336-56.103-56.106,0-32.107,23.999-56.105,56.103-56.105,31.771,0,56.107,23.997,56.107,56.105,0,31.77-24.336,56.106-56.107,56.106Z" />
                <path d="M503.43,233.909c0-19.291,15.638-34.929,34.929-34.929s34.929,15.638,34.929,34.929-15.638,34.929-34.929,34.929-34.929-15.638-34.929-34.929Z" />
                <title>{translation('results:modeNames.driving')}</title>
            </svg>
        )
    };
};

// Helper function to get the SVG for a mode
const getModeSvg = (translation: (key: string) => string, mode: string): React.ReactNode => {
    const svgs = getModeSvgs(translation);
    return svgs[mode] ?? null;
};

// SVG icons for cost items
const HomeIcon: React.FC<{ translation: (key: string) => string }> = ({ translation }) => {
    return (
        <svg
            className="svg-icon-activities-home svg-icon svg-icon-activities"
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            viewBox="0 0 800 800"
            role="img"
            aria-label={translation('results:locationComparison.costsHousing')}
        >
            <path d="M788.5,348.2L427.1,56.8c-14.9-14.9-39.1-14.9-54,0L11.2,348.7c-14.7,14.7-14.9,38.6-.5,53.5,14.9,15.4,40,15.2,55.1,0L400.1,137.9l334.8,264.8c7.5,7.5,17.2,11.2,27,11.2s20.2-4,27.7-11.9c14.3-15.1,13.5-39-1.2-53.7Z" />
            <path d="M400.1,180.8l-252.1,199.1c-5.7,5.7-8.9,13.5-8.9,21.5v300.6c0,16.9,13.7,30.6,30.6,30.6h119.2c16.9,0,30.6-13.7,30.6-30.6v-176c0-16.9,13.7-30.6,30.6-30.6h100c16.9,0,30.6,13.7,30.6,30.6v176c0,16.9,13.7,30.6,30.6,30.6h119.6c16.9,0,30.6-13.6,30.6-30.5v-300.6c0-8.1-3.2-15.8-8.9-21.5l-252.5-199.2Z" />
            <title>{translation('results:locationComparison.costsHousing')}</title>
        </svg>
    );
};

const CarIcon: React.FC<{ translation: (key: string) => string }> = ({ translation }) => {
    return (
        <svg
            className="svg-icon-modes-car_driver_without_passenger svg-icon svg-icon-modes"
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            viewBox="0 0 800 800"
            role="img"
            aria-label={translation('results:modeNames.driving')}
        >
            <path d="M757.077,381.465l-11.879-15.416,4.243-1.002c17.798-4.202,28.923-22.202,24.721-40h0c-4.202-17.798-22.202-28.923-40-24.721l-15.091,3.562c-12.329-46.687-27.84-89.564-37.028-108.989-17.913-38.193-53.063-60.837-98.012-66.921-22.645-2.702-96.662-4.731-184.201-4.731s-161.216,2.366-183.862,4.731c-44.95,5.408-80.1,28.729-98.014,66.921-9.147,19.34-24.56,61.924-36.861,108.37l-12.466-2.943c-17.798-4.202-35.798,6.923-40,24.721h0c-4.202,17.798,6.923,35.798,24.721,40l1.883.445-12.31,15.974C11.492,422.023,0,454.13,0,510.911v195.016c0,25.01,19.603,44.275,44.952,44.275h39.881c25.011,0,44.613-19.266,44.613-44.275v-56.781c75.033,4.731,183.524,8.112,270.385,8.112s195.693-3.38,270.723-8.112v56.781c0,25.01,19.264,44.275,44.611,44.275h39.884c25.347,0,44.95-19.266,44.95-44.275v-195.016c0-56.781-11.49-88.888-42.923-129.446ZM139.587,316.573c8.112-37.179,24.335-85.509,35.488-105.113,9.125-15.886,18.927-22.645,37.178-25.011,25.687-3.718,83.145-5.745,187.58-5.745s162.231,1.351,187.918,5.745c17.913,2.704,27.713,9.125,37.176,25.011,11.496,19.264,26.704,67.934,35.487,105.113,3.046,12.504-2.027,17.237-15.206,16.222-12.637-.761-25.827-1.539-40.071-2.288-9.419-28.311-36.142-48.792-67.576-48.792-29.807,0-55.38,18.416-65.979,44.461-21.646-.304-45.41-.477-71.749-.477-122.011,0-188.931,3.718-245.035,7.096-13.182,1.015-17.913-3.718-15.209-16.222ZM487.996,326.437c9.484-17.674,28.141-29.723,49.563-29.723,22.708,0,42.3,13.542,51.161,32.968-28.141-1.343-60.62-2.524-100.724-3.245ZM153.443,569.721c-32.107,0-56.105-24.336-56.105-56.106,0-32.107,23.997-56.105,56.105-56.105s56.105,23.997,56.105,56.105c0,31.77-23.996,56.106-56.105,56.106ZM489.735,554.173h-179.468c-23.658,0-40.22-16.898-40.22-40.558,0-23.996,16.562-40.558,40.22-40.558h179.468c23.66,0,40.22,16.562,40.22,40.558,0,23.66-16.561,40.558-40.22,40.558ZM646.557,569.721c-32.104,0-56.103-24.336-56.103-56.106,0-32.107,23.999-56.105,56.103-56.105,31.771,0,56.107,23.997,56.107,56.105,0,31.77-24.336,56.106-56.107,56.106Z" />
            <path d="M503.43,233.909c0-19.291,15.638-34.929,34.929-34.929s34.929,15.638,34.929,34.929-15.638,34.929-34.929,34.929-34.929-15.638-34.929-34.929Z" />
            <title>{translation('results:modeNames.driving')}</title>
        </svg>
    );
};

// Helper function to build the frequent destinations
const buildFrequentDestinations = (
    routingTimeDistances: RoutingTimeDistances,
    homeAddressUuid: string
): DestinationResult[] => {
    return Object.entries(routingTimeDistances).flatMap(([destinationUuid, destinationResult]) => {
        if (!destinationResult) {
            return [];
        }
        const resultsByMode = destinationResult.resultsByMode;
        return Object.entries(resultsByMode).map(([mode, result]) => ({
            destinationAddressUuid: destinationUuid,
            mode: mode as 'walking' | 'cycling' | 'driving' | 'transit',
            distanceMeters: result?.distanceMeters,
            travelTimeSeconds: result?.travelTimeSeconds,
            homeAddressUuid
        }));
    });
};

// Cost item type (for housing/transport)
type CostItemProps = {
    id: string; // e.g., "housing-cost-item-1"
    label: string; // e.g., "Housing" or "Transport"
    icon: React.ReactNode; // SVG icon component
    value: string | number | undefined; // Cost value to format
};

// Cost item component (for housing/transport)
const CostItem: React.FC<CostItemProps> = ({ id, label, icon, value }) => (
    <div id={id} className="value-item">
        <div>{label}</div>
        {icon}
        <div>{formatCurrency(value)}</div>
    </div>
);

// Total cost item type
type TotalCostItemProps = {
    id: string; // e.g., "total-cost-item-1"
    totalCost: string | number | undefined; // Total cost value
    percentageOfIncome: string | undefined; // Percentage string
};

// Total cost item component
const TotalCostItem: React.FC<TotalCostItemProps & { translation: (key: string) => string }> = ({
    id,
    totalCost,
    percentageOfIncome: _percentageOfIncome,
    translation
}) => {
    return (
        <div id={id} className="value-item">
            <div>{translation('results:locationComparison.costsTotal')}</div>
            <div>{formatCurrency(totalCost)}</div>
            {/* TODO: Add percentageOfIncome when this is implemented */}
            {/* {percentageOfIncome !== undefined && (
                <div>{translation('results:locationComparison.costsPercentageOfIncome', { percentageOfIncome })}</div>
            )} */}
        </div>
    );
};

// Environment item type (for POI/CO2)
// type EnvironmentItemProps = {
//     id: string; // e.g., "point-interest-item-1"
//     label: string; // e.g., "Points of interest" or "CO2"
//     icon: React.ReactNode; // Emoji or icon
//     value: string; // Display value
// };

//Environment item component (for POI/CO2)
// const EnvironmentItem: React.FC<EnvironmentItemProps> = ({ id, label, icon, value }) => (
//     <div id={id} className="value-item">
//         <div>{label}</div>
//         <div>{icon}</div>
//         <div>{value}</div>
//     </div>
// );

// Frequent destination card component
type FrequentDestinationCardProps = {
    result: DestinationResult;
};

const FrequentDestinationCard: React.FC<FrequentDestinationCardProps & { translation: (key: string) => string }> = ({
    result,
    translation
}) => {
    const modeSvg = getModeSvg(translation, result.mode);

    return (
        <div className="value-item">
            <div className="frequent-destination-mode">
                {modeSvg}
                <span>{translation(`results:modeNames.${result.mode}`)}</span>
            </div>
            <div>
                {formatTime(result.travelTimeSeconds)} ({formatDistance(result.distanceMeters)})
            </div>
        </div>
    );
};

// Frequent destination column component
type FrequentDestinationColumnProps = {
    title: string;
    rows: DestinationResult[];
};

const FrequentDestinationColumn: React.FC<
    FrequentDestinationColumnProps & { translation: (key: string) => string }
> = ({ title, rows, translation }) => (
    <section className="frequent-destinations-section-container">
        <h4>{title}</h4>
        {rows.map((row) => (
            <FrequentDestinationCard
                key={`${row.homeAddressUuid}-${row.destinationAddressUuid}-${row.mode}`}
                result={row}
                translation={translation}
            />
        ))}
    </section>
);

// Main component to render the results section
export const LocalisationResultsSection: React.FC<SectionProps> = (props: SectionProps) => {
    const { preloaded } = useSectionTemplate(props);
    const { t } = useTranslation();

    if (!preloaded) {
        return <LoadingPage />;
    }

    // TODO: Do a function that returns the information about the address and the destinations for both addresses

    // Get addresses array (already sorted by _sequence)
    const addresses = getAddressesArray(props.interview);
    // Find all the information about the first address (first home option)
    const firstAddress = addresses[0]; // Full object for first address
    const firstAddressUuid = firstAddress?._uuid; // UUID of first address
    // TODO: This field should be required
    const firstAddressName = t('results:locationComparison.address', {
        address: firstAddress?.name ?? t('results:locationComparison.defaultAddressName', { number: 1 })
    }); // Display label for first address
    const firstAddressHousingCost = firstAddress?.monthlyCost?.housingCostMonthly ?? t('results:notApplicable'); // Monthly housing cost
    const firstAddressTransportCost = firstAddress?.monthlyCost?.carCostMonthly ?? t('results:notApplicable'); // Monthly transport cost
    const firstAddressTotalCost = firstAddress?.monthlyCost?.totalCostMonthly ?? t('results:notApplicable'); // Sum of monthly costs
    // TODO: This field is not working yet
    const firstAddressHousingCostPercentageOfIncome = firstAddress?.monthlyCost?.housingCostPercentageOfIncome ?? '0'; // % of income spent
    // TODO: This field should be optional and dynamically generated based on the housing cost percentage of income
    // const firstAddressCostsWarning = t('results:locationComparison.tooMuchSpendingWarning');
    // const firstAddressPointsOfInterest = firstAddress?.pointsOfInterest ?? '0'; // Count of POIs near first address
    // TODO: This field is not working yet
    // const firstAddressCo2 = t('results:locationComparison.environmentCo2Value', { value: firstAddress?.co2 ?? 0 });
    const firstAddressRoutingTimeDistances = firstAddress?.routingTimeDistances || {}; // Travel times/distances from first address to destinations

    // Find all the information about the second address (second home option)
    const secondAddress = addresses[1]; // Full object for second address
    const secondAddressUuid = secondAddress?._uuid; // UUID of second address
    // TODO: This field should be required
    const secondAddressName = t('results:locationComparison.address', {
        address: secondAddress?.name ?? t('results:locationComparison.defaultAddressName', { number: 2 })
    }); // Display label for second address
    const secondAddressHousingCost = secondAddress?.monthlyCost?.housingCostMonthly ?? t('results:notApplicable'); // Monthly housing cost
    const secondAddressTransportCost = secondAddress?.monthlyCost?.carCostMonthly ?? t('results:notApplicable'); // Monthly transport cost
    const secondAddressTotalCost = secondAddress?.monthlyCost?.totalCostMonthly ?? t('results:notApplicable'); // Sum of monthly costs
    // TODO: This field is not working yet
    const secondAddressHousingCostPercentageOfIncome = secondAddress?.monthlyCost?.housingCostPercentageOfIncome ?? '0'; // % of income spent on housing
    // TODO: This field should be optional, and dynamically generated based on the number of cars in the second address
    // const secondAddressCostsWarning = t('results:locationComparison.tooManyCarsWarning', { numberOfCars: 2 });
    // TODO: This field is not working yet
    // const secondAddressPointsOfInterest = secondAddress?.pointsOfInterest ?? '0'; // Count of POIs near second address
    // TODO: This field is not working yet
    // const secondAddressCo2 = t('results:locationComparison.environmentCo2Value', { value: secondAddress?.co2 ?? 0 });
    const secondAddressRoutingTimeDistances = secondAddress?.routingTimeDistances || {}; // Travel times/distances from second address to destinations

    // Build frequent destinations list (both homes, all destinations)
    // Flat list of all (home, destination, mode) combinations
    // Note: We need to check if the address UUIDs are defined to avoid errors
    const allFrequentDestinations: DestinationResult[] = [
        ...(firstAddressUuid && firstAddressRoutingTimeDistances
            ? buildFrequentDestinations(firstAddressRoutingTimeDistances as RoutingTimeDistances, firstAddressUuid)
            : []),
        ...(secondAddressUuid && secondAddressRoutingTimeDistances
            ? buildFrequentDestinations(secondAddressRoutingTimeDistances as RoutingTimeDistances, secondAddressUuid)
            : [])
    ];

    // Determine destination order from first address routing data
    const destinationUuidsInOrder = getDestinationsArray(props.interview).map((dest) => dest._uuid);

    // Prepare required data
    surveyHelper.devLog('%c rendering section ' + props.shortname, 'background: rgba(0,0,255,0.1);');
    const widgetsComponentsByShortname = {};

    // Setup widgets
    for (let i = 0, count = props.sectionConfig.widgets.length; i < count; i++) {
        const widgetShortname = props.sectionConfig.widgets[i];

        widgetsComponentsByShortname[widgetShortname] = (
            <Widget
                key={widgetShortname}
                currentWidgetShortname={widgetShortname}
                nextWidgetShortname={props.sectionConfig.widgets[i + 1]}
                sectionName={props.shortname}
                interview={props.interview}
                errors={props.errors}
                user={props.user}
                loadingState={props.loadingState}
                startUpdateInterview={props.startUpdateInterview}
                startAddGroupedObjects={props.startAddGroupedObjects}
                startRemoveGroupedObjects={props.startRemoveGroupedObjects}
                startNavigate={props.startNavigate}
            />
        );
    }

    return (
        <section className={`survey-section survey-section-shortname-${props.shortname}`}>
            {/* Map on the left side */}
            <div className="survey-visited-places-map">{widgetsComponentsByShortname['comparisonMap']}</div>

            {/* Location comparison on the right side */}
            <section className="location-comparison">
                {/* Location names section that is sticky */}
                <section id="location-names-section">
                    <h2>{t('results:locationComparison.title')}</h2>
                    <div>{firstAddressName}</div>
                    <div>{secondAddressName}</div>
                </section>

                {/* Costs Section */}
                <section id="costs-section">
                    <h3 id="costs-section-title">{t('results:locationComparison.costsTitle')}</h3>
                    <div id="button-group-costs" className="button-group">
                        <button className="active" type="button">
                            {t('results:locationComparison.costsMonthly')}
                        </button>
                        {/* TODO: Add annual and 25 years buttons when this is implemented */}
                        {/* <button className="inactive" type="button">
                            {t('results:locationComparison.costsAnnual')}
                        </button>
                        <button className="inactive" type="button">
                            {t('results:locationComparison.costs25years')}
                        </button> */}
                    </div>

                    <CostItem
                        id="housing-cost-item-1"
                        label={t('results:locationComparison.costsHousing')}
                        icon={<HomeIcon translation={t} />}
                        value={firstAddressHousingCost}
                    />
                    <CostItem
                        id="transport-cost-item-1"
                        label={t('results:locationComparison.costsTransport')}
                        icon={<CarIcon translation={t} />}
                        value={firstAddressTransportCost}
                    />
                    <CostItem
                        id="housing-cost-item-2"
                        label={t('results:locationComparison.costsHousing')}
                        icon={<HomeIcon translation={t} />}
                        value={secondAddressHousingCost}
                    />
                    <CostItem
                        id="transport-cost-item-2"
                        label={t('results:locationComparison.costsTransport')}
                        icon={<CarIcon translation={t} />}
                        value={secondAddressTransportCost}
                    />

                    <TotalCostItem
                        id="total-cost-item-1"
                        totalCost={firstAddressTotalCost}
                        percentageOfIncome={firstAddressHousingCostPercentageOfIncome.toString()}
                        translation={t}
                    />
                    <TotalCostItem
                        id="total-cost-item-2"
                        totalCost={secondAddressTotalCost}
                        percentageOfIncome={secondAddressHousingCostPercentageOfIncome.toString()}
                        translation={t}
                    />

                    {/* TODO: Add costs warning when it is implemented */}
                    {/* <div id="note-costs-item-1">{firstAddressCostsWarning}</div>
                    <div id="note-costs-item-2">{secondAddressCostsWarning}</div> */}
                </section>

                {/* TODO: Add environment section when it is implemented */}
                {/* Environment Section */}
                {/* <section id="environment-section">
                    <h3 id="environment-section-title">{t('results:locationComparison.environmentTitle')}</h3>

                    <EnvironmentItem
                        id="point-interest-item-1"
                        label={t('results:locationComparison.environmentPointsOfInterest')}
                        icon="📍"
                        value={firstAddressPointsOfInterest}
                    />
                    <EnvironmentItem id="environment-item-1" label={t('results:locationComparison.environmentCo2')} icon="🌱" value={firstAddressCo2} />
                    <EnvironmentItem
                        id="point-interest-item-2"
                        label={t('results:locationComparison.environmentPointsOfInterest')}
                        icon="📍"
                        value={secondAddressPointsOfInterest}
                    />
                    <EnvironmentItem id="environment-item-2" label={t('results:locationComparison.environmentCo2')} icon="🌱" value={secondAddressCo2} />
                </section> */}

                {/* Frequent Destinations Section */}
                <section id="frequent-destinations-section">
                    <h3>{t('results:locationComparison.frequentDestinationsTitle')}</h3>

                    {destinationUuidsInOrder.map((destinationUuid, index) => {
                        // Get the destination name
                        const destinationName: string | undefined = getDestinationsArray(props.interview).find(
                            (dest) => dest._uuid === destinationUuid
                        )?.name;
                        const destinationNameForDisplay =
                            destinationName && destinationName.trim().length > 0
                                ? destinationName
                                : t('results:locationComparison.destinationNumber', { number: index + 1 });

                        // Get rows for the destination
                        const destinationRows = allFrequentDestinations.filter(
                            (d) => d.destinationAddressUuid === destinationUuid
                        );

                        // If there are no destination rows, return null
                        if (destinationRows.length === 0) {
                            return null;
                        }

                        // Get rows for each address
                        const firstAddressRows = destinationRows.filter((d) => d.homeAddressUuid === firstAddressUuid);
                        const secondAddressRows = destinationRows.filter(
                            (d) => d.homeAddressUuid === secondAddressUuid
                        );

                        // Get address names for titles (without "For " prefix)
                        const firstAddressDisplayName =
                            firstAddress?.name ??
                            t('results:locationComparison.defaultAddressName', {
                                number: 1
                            });
                        const secondAddressDisplayName =
                            secondAddress?.name ?? t('results:locationComparison.defaultAddressName', { number: 2 });

                        // Return the frequent destinations columns
                        return (
                            <div key={destinationUuid} className="frequent-destinations-columns">
                                <FrequentDestinationColumn
                                    title={t('results:locationComparison.frequentDestinationsFrom', {
                                        address: firstAddressDisplayName,
                                        destination: destinationNameForDisplay
                                    })}
                                    rows={firstAddressRows}
                                    translation={t}
                                />
                                <FrequentDestinationColumn
                                    title={t('results:locationComparison.frequentDestinationsFrom', {
                                        address: secondAddressDisplayName,
                                        destination: destinationNameForDisplay
                                    })}
                                    rows={secondAddressRows}
                                    translation={t}
                                />
                            </div>
                        );
                    })}
                </section>
            </section>
        </section>
    );
};

export default LocalisationResultsSection;
