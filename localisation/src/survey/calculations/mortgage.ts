/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// Convert Canadian nominal rate to effective monthly rate
// In Canada, the mortgage interest are compounded every 6 months
function effectiveSemiAnnualMonthlyRate(nominalAnnualRate: number): number {
    // Compounded semi-annually, then converted to monthly
    return Math.pow(1 + nominalAnnualRate / 2, 1 / 6) - 1;
}

/**
 * Calculate the monthly payment for a mortgage
 * @param principal The principal amount of the mortgage
 * @param annualRate The annual interest rate (as a decimal, so 5% = 0.05)
 * @param amortizationMonths The amortization period in months
 * @returns The monthly payment amount
 */
export function mortgageMonthlyPayment(principal: number, annualRate: number, amortizationMonths: number): number {
    if (principal < 0 || annualRate < 0 || amortizationMonths <= 0) {
        throw new Error(
            'Invalid mortgage parameters: amortization must be positive, principal and rate must be non-negative'
        );
    }

    // Edge case where the interest is 0%
    if (annualRate === 0) {
        return principal / amortizationMonths;
    }

    const i = effectiveSemiAnnualMonthlyRate(annualRate);
    const n = amortizationMonths;
    return (principal * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1);
}
