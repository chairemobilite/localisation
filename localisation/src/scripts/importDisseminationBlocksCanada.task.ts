/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// COPY-PASTE WARNING: This task is mostly copied from transition and added here so we can import the proximity indices to Localisation's database.
// We currently have no need for the population data, so we have removed the population import for now.
import { ImportDisseminationBlocksCanada } from '../tasks/importDisseminationBlocksCanada';
import taskWrapper from 'chaire-lib-backend/lib/tasks/taskWrapper';

taskWrapper(new ImportDisseminationBlocksCanada())
    .then(() => {
        process.exit();
    })
    .catch((err) => {
        console.error('Error executing task', err);
        process.exit();
    });
