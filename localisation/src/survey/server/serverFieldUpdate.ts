import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { getAddressesArray } from '../common/customHelpers';
import { calculateMonthlyCost } from '../calculations';

export default [
    {
        field: '_sections._actions',
        runOnValidatedData: false, // make sure not to run in validation mode!
        callback: async (interview: InterviewAttributes, value) => {
            // Calculate monthly cost of localisation and trip data
            try {
                // Return if the change is not happening in the results section
                if (!(Array.isArray(value) && value[value.length - 1]?.section === 'results')) {
                    return {};
                }
                const updatedValues = {};
                // Calculate the monthly cost for each address
                const addresses = getAddressesArray(interview);
                for (let i = 0; i < addresses.length; i++) {
                    const address = addresses[i];
                    const calculationResults = calculateMonthlyCost(address, interview);
                    updatedValues[`addresses.${address._uuid}.monthlyCost`] = calculationResults;
                }
                return updatedValues;
            } catch (error) {
                console.error('error calculating monthly cost', error);
                return {};
            }
        }
    }
];
