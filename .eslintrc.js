module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    "jest/globals": true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:jest/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
  ],
  globals: {
    _: false,
    it: false,
    describe: false,

    yaxys: false,

    // Classes
    Adapter: false,
    App: false,
    PageRouter: false,

    // Services
    AccessService: false,
    AuthService: false,
    ModelService: false,
    PolicyService: false,
    RestService: false,
    UtilService: false,
    ZoneService: false,

    // client-side
    yaxysConstants: false
  },
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 2018,
    ecmaFeatures: {
      experimentalObjectRestSpread: true,
      jsx: true,
      legacyDecorators: true,
    },
    sourceType: "module",
  },
  plugins: ["react", "jest"],
  rules: {
    "import/no-unresolved": 1,
    "eol-last": [2, "always"],
    "no-console": 1,
    "no-debugger": 1,
    "no-unused-vars": [2, { ignoreRestSiblings: true, args: "none" }],
    "linebreak-style": ["error", "unix"],
    "react/display-name": 1,
    "react/forbid-prop-types": [1, { forbid: ["any"] }],
    "react/jsx-boolean-value": 0,
    "react/jsx-closing-bracket-location": 0,
    "react/jsx-indent-props": 0,
    "react/jsx-key": 1,
    "react/jsx-max-props-per-line": 0,
    "react/jsx-no-bind": [1, { allowArrowFunctions: true }],
    "react/jsx-no-duplicate-props": 1,
    "react/jsx-no-literals": 0,
    "react/jsx-no-undef": 1,
    "react/jsx-pascal-case": 1,
    "react/jsx-sort-prop-types": 0,
    "react/jsx-sort-props": 0,
    "react/jsx-uses-react": 1,
    "react/jsx-uses-vars": 1,
    "react/jsx-wrap-multilines": [1, { arrow: false, declaration: false }],
    "react/no-danger": 1,
    "react/no-did-mount-set-state": 1,
    "react/no-did-update-set-state": 1,
    "react/no-direct-mutation-state": 0,
    "react/no-multi-comp": 0,
    "react/no-set-state": 0,
    "react/no-unescaped-entities": 0,
    "react/no-unknown-property": 1,
    "react/prefer-es6-class": 1,
    "react/prop-types": [2, { ignore: ["classes", "children"] }],
    "react/react-in-jsx-scope": 1,
    "react/self-closing-comp": 1,
    "react/sort-comp": 2,
    "jest/no-focused-tests": 1,
    "jest/no-identical-title": 2,
    "jest/valid-expect": 2,

    "valid-jsdoc": [2, { "requireReturn": false }],

    // prettier-oriented rules
    "semi": [2, "never"],
    "max-len": [1, { code: 120, ignoreStrings: true, ignoreTemplateLiterals: true }],
    "comma-dangle": [2, "always-multiline"],
    "quotes": [1, "double", { avoidEscape: true }],
    "space-in-parens": [2, "never"],
    "comma-spacing": 2,
    "object-curly-spacing": [2, "always"],
  },
}
