/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import serverFieldUpdate from '../serverFieldUpdate';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { Address } from '../../common/types';

describe('serverFieldUpdate - _sections._actions callback', () => {
    const sectionsActionsCallback = serverFieldUpdate.find(callback => callback.field === '_sections._actions')!;

    const createMockInterview = (addresses: { [uuid: string]: Address } = {}): UserInterviewAttributes => ({
        id: 1,
        uuid: 'interview-uuid',
        participant_id: 1,
        is_completed: false,
        response: {
            addresses
        } as any,
        validations: {},
        is_valid: true
    });

    describe('callback metadata', () => {
        it('should have correct field configuration', () => {
            expect(sectionsActionsCallback.field).toBe('_sections._actions');
            expect(sectionsActionsCallback.runOnValidatedData).toBe(false);
        });
    });

    describe('callback execution - results section', () => {
        it('should calculate monthly cost for single rent address when navigating to results section', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rent: 1200,
                areUtilitiesIncluded: true
            };

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect(result['addresses.address-1.monthlyCost']).toEqual({
                housingCostMonthly: 1200,
                housingCostPercentageOfIncome: null
            });
        });

        it('should calculate monthly cost for single mortgage address when navigating to results section', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriod: '25',
                taxes: 3600,
                utilities: 200
            };

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBeGreaterThan(2200);
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBeLessThan(2300);
            expect(result['addresses.address-1.monthlyCost'].housingCostPercentageOfIncome).toBeNull();
        });

        it('should calculate monthly cost for multiple addresses when navigating to results section', async () => {
            const address1: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rent: 1200,
                areUtilitiesIncluded: true
            };

            const address2: Address = {
                _sequence: 2,
                _uuid: 'address-2',
                ownership: 'rent',
                rent: 1500,
                areUtilitiesIncluded: false,
                utilities: 150
            };

            const interview = createMockInterview({
                'address-1': address1,
                'address-2': address2
            });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect('addresses.address-2.monthlyCost' in result).toBe(true);

            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBe(1200);
            expect(result['addresses.address-2.monthlyCost'].housingCostMonthly).toBe(1650);
        });

        it('should handle addresses with incomplete data gracefully', async () => {
            const address1: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rent: 1200,
                areUtilitiesIncluded: true
            };

            const address2: Address = {
                _sequence: 2,
                _uuid: 'address-2',
                ownership: 'rent'
                // Missing rent data
            };

            const interview = createMockInterview({
                'address-1': address1,
                'address-2': address2
            });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBe(1200);
            expect(result['addresses.address-2.monthlyCost'].housingCostMonthly).toBeNull();
        });

        it('should return empty object when no addresses exist', async () => {
            const interview = createMockInterview({});
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value);

            expect(result).toEqual({});
        });
    });

    describe('callback execution - non-results sections', () => {
        it('should return empty object when navigating to a non-results section', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rent: 1200,
                areUtilitiesIncluded: true
            };

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'profile' }];

            const result = await sectionsActionsCallback.callback(interview, value);

            expect(result).toEqual({});
        });

        it('should return empty object when value is not an array', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rent: 1200,
                areUtilitiesIncluded: true
            };

            const interview = createMockInterview({ 'address-1': address });
            const value = { section: 'results' };

            const result = await sectionsActionsCallback.callback(interview, value);

            expect(result).toEqual({});
        });

        it('should return empty object when value is an empty array', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rent: 1200,
                areUtilitiesIncluded: true
            };

            const interview = createMockInterview({ 'address-1': address });
            const value: any[] = [];

            const result = await sectionsActionsCallback.callback(interview, value);

            expect(result).toEqual({});
        });

        it('should check the last element in the array for results section', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rent: 1200,
                areUtilitiesIncluded: true
            };

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'profile' }, { section: 'addresses' }, { section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBe(1200);
        });

        it('should not calculate if last element is not results section', async () => {
            const address: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rent: 1200,
                areUtilitiesIncluded: true
            };

            const interview = createMockInterview({ 'address-1': address });
            const value = [{ section: 'results' }, { section: 'profile' }];

            const result = await sectionsActionsCallback.callback(interview, value);

            expect(result).toEqual({});
        });
    });

    describe('error handling', () => {
        it('should handle errors gracefully and return empty object', async () => {
            // Create an interview that will cause an error in getAddressesArray
            const invalidInterview = {
                id: 1,
                uuid: 'interview-uuid',
                participant_id: 1,
                is_completed: false,
                response: null, // This will cause an error
                validations: {},
                is_valid: true
            } as any;

            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(invalidInterview, value);

            expect(result).toEqual({});
        });

        it('should handle calculation errors for individual addresses', async () => {
            const address1: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rent: 1200,
                areUtilitiesIncluded: true
            };

            // Invalid address that might cause calculation issues
            const address2: Address = {
                _sequence: 2,
                _uuid: 'address-2',
                ownership: 'buy',
                mortgage: 300000,
                interestRate: 5,
                amortizationPeriod: 'invalid' as any
            };

            const interview = createMockInterview({
                'address-1': address1,
                'address-2': address2
            });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            // Should still process valid address
            expect(result['addresses.address-1.monthlyCost'].housingCostMonthly).toBe(1200);
            // Invalid address should have null
            expect(result['addresses.address-2.monthlyCost'].housingCostMonthly).toBeNull();
        });
    });

    describe('address ordering', () => {
        it('should process addresses in sequence order', async () => {
            const address2: Address = {
                _sequence: 2,
                _uuid: 'address-2',
                ownership: 'rent',
                rent: 1100,
                areUtilitiesIncluded: true
            };

            const address1: Address = {
                _sequence: 1,
                _uuid: 'address-1',
                ownership: 'rent',
                rent: 1200,
                areUtilitiesIncluded: true
            };

            // Add them out of order
            const interview = createMockInterview({
                'address-2': address2,
                'address-1': address1
            });
            const value = [{ section: 'results' }];

            const result = await sectionsActionsCallback.callback(interview, value) as any;

            // All addresses should be calculated regardless of order
            expect('addresses.address-1.monthlyCost' in result).toBe(true);
            expect('addresses.address-2.monthlyCost' in result).toBe(true);
        });
    });
});
