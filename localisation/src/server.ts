/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import path from 'path';

import setupServer from 'evolution-backend/lib/apps/participant';
import { setProjectConfig } from 'evolution-backend/lib/config/projectConfig';
import { registerTranslationDir, addTranslationNamespace } from 'chaire-lib-backend/lib/config/i18next';

// TODO Add server update callbacks, if any
// TODO Add server validations, if any

const configureServer = () => {
    setProjectConfig({
        serverUpdateCallbacks: [],
        serverValidations: {}
    });
};

setupServer(configureServer);

// FIXME Project directory is for runtime, locales should be in the config file (See #420)
registerTranslationDir(path.join(__dirname, '../locales/'));
addTranslationNamespace('customServer');
