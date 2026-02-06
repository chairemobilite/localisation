const baseConfig = require('../evolution/tests/jest.config.base');

module.exports = {
    ...baseConfig,
    "testPathIgnorePatterns": ["UI.spec"],
    setupFilesAfterEnv: [
        '../evolution/tests/jestSetup.base.ts',
        './setupTests.ts'
    ],
    // Adding these for the onnx based test
    globals: {
        BigInt64Array: BigInt64Array,
        BigUint64Array: BigUint64Array,
        Float32Array: Float32Array
    },
};
