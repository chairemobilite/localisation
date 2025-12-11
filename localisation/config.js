module.exports = {
    projectShortname: `localisation`,
    projectDirectory: `${__dirname}/runtime`,
    logoPaths: {
        fr: `/dist/images/localisation_fr.png`,
        en: `/dist/images/localisation_en.png`
    },
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
    mapDefaultZoom: 8,
    mapDefaultCenter: { //Centered on Montreal
        lat: 45.4987514031582,
        lon: -73.57516374646
    },
    mapMaxGeocodingResultsBounds: [{ //Bounding box for all of Canada
        lat: 83.23324,
        lng: -52.6480987209
    }, 
    {
        lat: 41.6751050889,
        lng: -140.99778
    }],
    trRoutingScenarios: {
        SE: '6fff51a9-b6d9-464e-bf2b-eeae574ac75e'
    },
    
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
        fr: "Localisation",
        en: "Localisation"
    },
    defaultLocale: "fr",
    timezone: 'America/Montreal',
};
