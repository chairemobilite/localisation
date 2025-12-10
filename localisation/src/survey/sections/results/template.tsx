/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import _get from 'lodash/get';
import _cloneDeep from 'lodash/cloneDeep';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { Widget } from 'evolution-frontend/lib/components/survey/Widget';
import * as surveyHelper from 'evolution-common/lib/utils/helpers';
import LoadingPage from 'chaire-lib-frontend/lib/components/pages/LoadingPage';
import { SectionProps, useSectionTemplate } from 'evolution-frontend/lib/components/hooks/useSectionTemplate';

export const LocalisationResultsSection: React.FC<SectionProps> = (props: SectionProps) => {
    const { preloaded } = useSectionTemplate(props);

    if (!preloaded) {
        return <LoadingPage />;
    }

    // Prepare required data
    surveyHelper.devLog('%c rendering section ' + props.shortname, 'background: rgba(0,0,255,0.1);');
    const widgetsComponentsByShortname = {};

    // setup widgets:
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
            <div className="survey-section__content">
                {widgetsComponentsByShortname['resultsIntro']}
                <div className="survey-visited-places-list-and-map-container">
                    <div className={'survey-visited-places-map'}>{widgetsComponentsByShortname['comparisonMap']}</div>
                </div>
            </div>
        </section>
    );
};

export default LocalisationResultsSection;
