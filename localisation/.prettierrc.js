const gtsPrettierrcConfig = require('../evolution/configs/gts.prettierrc.json');

module.exports = {
    ...gtsPrettierrcConfig,
    "tabWidth": 4,
    "arrowParens": "always",
    "bracketSpacing": true,
    "trailingComma": "none",
    "printWidth": 120,
}