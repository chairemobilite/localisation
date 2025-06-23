const moment = require('moment');

const holidays = ['2024-09-02', '2024-10-14', '2024-12-25', '2025-01-01'];

moment.updateLocale('fr', {
    holidays,
    holidayFormat: 'YYYY-MM-DD',
    longDateFormat: {
        LL: "dddd Do MMMM YYYY",
    }
});

moment.updateLocale('en', {
    holidays,
    holidayFormat: 'YYYY-MM-DD',
    longDateFormat: {
        LL: "dddd, MMMM Do YYYY",
    }
});

module.exports = {
    projectShortname: `localisation`,
    projectDirectory: `${__dirname}/runtime`,
    logoPaths: {
        fr: `/dist/images/localisation_fr.png`,
        en: `/dist/images/localisation_en.png`
    },
    forceRecalculateTransitTrips: false,
    updateTransitRoutingIfCalculatedBefore: moment('2024-03-07').unix(), // timestamp, will recalculate transit trips if calculated before this date
    startButtonColor: 'turquoise', // styles for turquoise buttons are in the project's styles.scss file
    interviewableMinimumAge: 5,
    selfResponseMinimumAge: 14,
    singlePersonInterview: false,
    allowChangeSectionWithoutValidation: true,
    introductionTwoParagraph: true,
    includePartTimeStudentOccupation: true,
    includeWorkerAndStudentOccupation: true,
    acceptUnknownDidTrips: false,
    logDatabaseUpdates: true,
    allowRegistration: true,
    registerWithPassword: true,
    registerWithEmailOnly: true,
    askForAccessCode: true,
    isPartTwo: false,
    forgotPasswordPage: true,
    primaryAuthMethod: 'passwordless',
    auth: {
        passwordless: true,
        anonymous: true,
        google: false,
        facebook: false,
        byField: false
    },
    separateAdminLoginPage: true,
    mapDefaultZoom: 10,
    mapDefaultCenter: {
        lat: 46.81289,
        lon: -71.21461
    },
    mapMaxGeocodingResultsBounds: [
      {
        lat: 47.033374,
        lng: -70.8030445
      },
      {
        lat: 46.518331,
        lng: -71.671425
    }],
    detectLanguage: false,
    detectLanguageFromUrl: true,
    languages: ['fr', 'en'],
    locales: {
        fr: 'fr-CA',
        en: 'en-CA'
    },
    languageNames: {
        fr: "Français",
        en: "English"
    },
    title: {
        fr: "Enquête Nationale Origine-Destination 2025",
        en: "2025 National Origin-Destination Survey "
    },
    defaultLocale: "fr",
    timezone: 'America/Montreal',
};
