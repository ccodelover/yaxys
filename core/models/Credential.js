const config = require("config")

const CODE_FORMAT_PATTERNS = {
  hexadecimal: "^[0-9a-fA-F]+$",
  decimal: "^[0-9]+$",
}

const getCodePattern = (key = "decimal") => {
  const pattern = CODE_FORMAT_PATTERNS[key]
  if (!pattern) { throw new Error(`Unknown key for credential code pattern: ${key} `) }
  return pattern
}

module.exports = {
  schema: {
    title: "Credential",
    i18Key: "CREDENTIAL",
    timestamps: true,
    webhook: true,
    defaultProperties: ["id", "user", "code", "note"],
    uniqueKeys: {
      integrity: ["code"],
    },
    properties: {
      id: {
        type: "integer",
      },
      user: {
        title: "User",
        type: "integer",
        connection: {
          type: "m:1",
          relatedModel: "user",
        },
      },
      code: {
        title: "Code",
        type: "string",
        pattern: getCodePattern(config.get("credentialsCodeRestrictions.pattern") || "decimal"),
        minLength: config.get("credentialsCodeRestrictions.minLength"),
        maxLength: config.get("credentialsCodeRestrictions.maxLength"),
      },
      note: {
        title: "Note",
        type: "string",
        default: "",
      },
    },
    required: [],
  },

  api: RestService.buildStandardAPI("credential"),
}
