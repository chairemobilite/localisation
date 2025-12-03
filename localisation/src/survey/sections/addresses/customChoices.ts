import { type ChoiceType } from 'evolution-common/lib/services/questionnaire/types';

const MAX_AMORTIZATION_YEARS = 30;

// Automatically generate the choices for each year from 1 to 30, so we don't have to individually write each of them.
const generateAmortizationYears = (): ChoiceType[] => {
    const choiceArray: ChoiceType[] = [];
    for (let i = 1; i <= MAX_AMORTIZATION_YEARS; i++) {
        const currentChoice = {
            value: `${i}`,
            label: {
                fr: `${i} ${i === 1 ? 'an' : 'ans'}`,
                en: `${i} ${i === 1 ? 'year' : 'years'}`
            }
        };
        choiceArray.push(currentChoice);
    }
    return choiceArray;
};

export const amortizationYearsCustomChoices: ChoiceType[] = generateAmortizationYears();
