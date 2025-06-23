const baseConfig = require('../evolution/tests/jest.config.base');

module.exports = {
    ...baseConfig,
    "testPathIgnorePatterns": ["UI.spec"],
    setupFilesAfterEnv: [
        '../evolution/tests/jestSetup.base.ts',
        './setupTests.ts'
    ],
};