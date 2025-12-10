/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import runClientApp from 'evolution-frontend/lib/apps/participant';
import { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';
import appConfig from 'evolution-frontend/lib/config/application.config';

import surveySections from './survey/sections';
import { widgets as widgetsConfig } from './survey/widgetsConfigs';
import ResultsSection from './survey/sections/results/template';

setApplicationConfiguration({
    sections: surveySections,
    widgets: widgetsConfig,
    allowedUrlFields: ['source', 'accessCode'],
    templateMapping: { ...appConfig.templateMapping, results: ResultsSection }
});

runClientApp({ appContext: process.env.EV_VARIANT });
