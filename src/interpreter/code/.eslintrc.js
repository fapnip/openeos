module.exports = {
  plugins: [
    "es5"
  ],
  "extends": [
    "eslint:recommended",
    "plugin:es5/no-es2015"
  ],
  rules: {
    "no-extra-semi": "off"
  },
  globals: {
    "pages": "writable",
    "Timer": "readonly",
    "Say": "readonly",
    "Choice": "readonly",
    "Prompt": "readonly",
    "Sound":  "readonly",
    "teaseStorage": "readonly",
  }
}