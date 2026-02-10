/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { select } from '@inquirer/prompts';
import { fileSelector } from 'inquirer-file-selector';

import importBoundariesFromGml from '../importers/ZonesImporter';
import importProximityMeasuresFromCsv from '../importers/ProximityMeasuresImporter';
import { GenericTask } from 'chaire-lib-backend/lib/tasks/genericTask';
import dsQueries from 'chaire-lib-backend/lib/models/db/dataSources.db.queries';
import zonesQueries from 'chaire-lib-backend/lib/models/db/zones.db.queries';
import DataSource from 'chaire-lib-common/lib/services/dataSource/DataSource';

// COPY-PASTE WARNING: Code mostly copied from transition and added here so we can import the proximity indices to Localisation's database.
// We currently have no need for the population data, so we have removed the population import for now.
export class ImportDisseminationBlocksCanada implements GenericTask {
    private async promptOverwriteDataSource(dataSourceName: string): Promise<boolean> {
        const overwrite = await select({
            message: `${dataSourceName} already exists. Do you want to re-create the places in this data source?`,
            choices: [
                { name: 'Yes', value: true },
                { name: 'No', value: false }
            ]
        });
        return overwrite;
    }

    // This function is meant to work with the GML file found here: https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21
    // TODO: We want to support other file types eventually, like geojson.
    private async importBoundaries(boundariesFile: string | undefined, dataSourceId: string): Promise<void> {
        let file = boundariesFile;
        if (file === undefined) {
            // Request the file from the user
            const selection = await fileSelector({
                message: 'Please select the dissemination blocks boundaries file to import',
                filter: (item) => item.isDirectory || item.name.endsWith('.gml')
            });
            file = selection.path;
        }

        if (typeof file !== 'string') {
            throw new Error('File is undefined');
        }

        await importBoundariesFromGml(file, dataSourceId);
    }

    // This function is meant to work with the CSV file found here: https://www150.statcan.gc.ca/n1/pub/17-26-0002/172600022023001-eng.htm
    private async importIndexes(proximityFile: string | undefined): Promise<void> {
        let file = proximityFile;
        if (file === undefined) {
            // Request the file from the user
            const selection = await fileSelector({
                message: 'Please select the proximity index file to import',
                filter: (item) => item.isDirectory || item.name.endsWith('.csv')
            });
            file = selection.path;
        }

        if (typeof file !== 'string') {
            throw new Error('File is undefined');
        }

        await importProximityMeasuresFromCsv(file);
    }

    public async run(argv: { [key: string]: unknown }): Promise<void> {
        // Handle arguments and default values
        const boundariesFile = argv['boundaries-file'] !== undefined ? (argv['boundaries-file'] as string) : undefined;
        const proximityFile = argv['proximity-file'] !== undefined ? (argv['proximity-file'] as string) : undefined;

        const dataSourceName = 'Dissemination block boundaries 2021';

        const currentDataSourceAttributes = await dsQueries.findByName(dataSourceName);
        const currentDataSource =
            currentDataSourceAttributes === undefined
                ? new DataSource({ name: dataSourceName, shortname: dataSourceName, type: 'zones' }, true)
                : new DataSource(currentDataSourceAttributes, false);

        if (currentDataSourceAttributes === undefined || (await this.promptOverwriteDataSource(dataSourceName))) {
            const dataSourceId = currentDataSource.getId();

            // Create data source in the database or reset its data
            if (currentDataSourceAttributes === undefined) {
                console.log('Creating data source...');
                await dsQueries.create(currentDataSource.attributes);
                console.log('Data source created.');
            } else {
                console.log('Resetting data source...');
                await zonesQueries.deleteForDataSourceId(dataSourceId);
                console.log('Data source reset.');
            }

            await this.importBoundaries(boundariesFile, dataSourceId);
            await this.importIndexes(proximityFile);
        } else {
            console.log(`Not re-creating places in existing data source '${dataSourceName}'.`);
        }
    }
}
