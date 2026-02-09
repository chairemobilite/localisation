import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { getAddressesArray } from '../common/customHelpers';
import { calculateAccessibilityAndRouting, calculateMonthlyCost } from '../calculations';
import { Address } from '../common/types';

// FIXME Add callbacks to invalidate results when geographies change and calculate results only on demand
export default [
    {
        field: '_sections._actions',
        runOnValidatedData: false, // make sure not to run in validation mode!
        callback: async (interview: InterviewAttributes, value, _path, registerUpdateOperation?) => {
            // Calculate monthly cost of localisation and trip data
            try {
                // Return if the change is not happening in the results section
                if (!(Array.isArray(value) && value[value.length - 1]?.section === 'results')) {
                    return {};
                }

                // FIXME This should not be calculated upon section entry.
                // Ideally, all calculations should be done as soon as the
                // information is available.
                const executeAccessibilityAndRoutingCalculations = async (address: Address) => {
                    const updatedValues = {};
                    try {
                        const accessibilityAndRouting = await calculateAccessibilityAndRouting(address, interview);
                        updatedValues[`addresses.${address._uuid}.accessibilityMapsByMode`] =
                            accessibilityAndRouting.accessibilityMapsByMode;
                        updatedValues[`addresses.${address._uuid}.routingTimeDistances`] =
                            accessibilityAndRouting.routingTimeDistances;
                    } catch (error) {
                        console.error('error calculating accessibility and routing for address', address._uuid, error);
                        updatedValues[`addresses.${address._uuid}.accessibilityMapsByMode`] = null;
                        updatedValues[`addresses.${address._uuid}.routingTimeDistances`] = null;
                    }

                    return updatedValues;
                };

                const updatedValues = {};
                // Calculate the monthly cost for each address
                const addresses = getAddressesArray(interview);
                for (let i = 0; i < addresses.length; i++) {
                    const address = addresses[i];
                    const calculationResults = calculateMonthlyCost(address, interview);
                    updatedValues[`addresses.${address._uuid}.monthlyCost`] = calculationResults;
                    if (registerUpdateOperation) {
                        if (address.geography && address.geography.geometry?.type === 'Point') {
                            // Execute the operation in the backend so the result may be ready when needed, but without blocking the call
                            registerUpdateOperation({
                                opName: `addressCalculations${address._uuid}`,
                                opUniqueId: 1,
                                operation: async (_isCancelled: () => boolean) => {
                                    // FIXME Use the _isCancelled callback to stop the calculation
                                    return executeAccessibilityAndRoutingCalculations(address);
                                }
                            });
                            updatedValues[`addresses.${address._uuid}.accessibilityMapsByMode`] = 'calculating';
                            updatedValues[`addresses.${address._uuid}.routingTimeDistances`] = 'calculating';
                        } else {
                            console.warn(
                                'Address does not have valid geography, skipping accessibility and routing calculations for address',
                                address._uuid
                            );
                            updatedValues[`addresses.${address._uuid}.accessibilityMapsByMode`] = null;
                            updatedValues[`addresses.${address._uuid}.routingTimeDistances`] = null;
                        }
                    } else {
                        // FIXME Implement this for the admin case, not currently used
                        console.warn(
                            'No registerUpdateOperation function provided to serverFieldUpdate callback, results will not be registered as part of the current update operation. This should happen only in admin mode'
                        );
                        updatedValues[`addresses.${address._uuid}.accessibilityMapsByMode`] = null;
                        updatedValues[`addresses.${address._uuid}.routingTimeDistances`] = null;
                    }
                }
                return updatedValues;
            } catch (error) {
                console.error('error calculating monthly cost', error);
                return {};
            }
        }
    }
];
