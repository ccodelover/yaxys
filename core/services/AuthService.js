const bcrypt = require("bcrypt")
const config = require("config")
const jwt = require("jsonwebtoken")

module.exports = {
  OPERATOR_ATTRIBUTES_FOR_JWT: ["id", "email", "rights", "isAdministrator"],

  /**
   * Encrypt the password using bcrypt
   * @param {String} password The password to encrypt
   * @returns {String} encrypted password
   */
  encryptPassword: password => bcrypt.hashSync(password, config.get("bcryptSaltRounds")),

  /**
   * Check the password (does it correspond the hash)
   * @param {String} password The password being checked
   * @param {String} passwordHash The hash of the previously saved password
   * @returns {Boolean} True is the password is right
   */
  checkPassword: (password, passwordHash) => bcrypt.compareSync(password, passwordHash),

  /**
   * Find the operator by credentials (email and password) or throw the exception
   * @param {String} email Operator's email
   * @param {String} password Operator's password
   * @returns {Promise<Object>} The operator found
   */
  getOperatorByCredentials: async (email, password) => {
    const operator = await yaxys.db.findOne("operator", { email }, {})
    if (operator && AuthService.checkPassword(password, operator.passwordHash)) {
      return operator
    }
    throw new Error("No such operator or wrong password provided")
  },

  /**
   * Generate Json Web Token with the operator data as a payload
   * @param {Object} operator The operator to put to payload
   * @returns {String} The token
   */
  generateToken: operator =>
    jwt.sign(
      _.pick(operator, ...AuthService.OPERATOR_ATTRIBUTES_FOR_JWT),
      config.get("jwt.secret"),
      { expiresIn: config.get("jwt.lifetime") }
    ),

  /**
   * Check if the token is valid.
   * If valid, return the payload without "iat" field
   * If not – throw the exception
   * @param {String} token The token to check
   * @returns {Object} The token's payload
   */
  checkAndDecodeToken: token => {
    const result = jwt.verify(token, config.get("jwt.secret"))
    return _.omit(result, "iat")
  },

  /**
   * Check if operator has rights to perform an action
   * @param {Object} operator The operator object
   * @param {String} modelKey The name of the model for which we are checking rights
   * @param {String} right The name of the right
   * @returns {Promise<boolean>} True if operator has rights and false if not
   */
  checkRight: async (operator, modelKey, right) => {
    if (operator.isAdministrator) {
      return true
    }

    if (operator.rights
      && operator.rights[modelKey.toLowerCase()]
      && (!(operator.rights[modelKey.toLowerCase()][right.toLowerCase()] == null))
    ) {
      return !!operator.rights[modelKey.toLowerCase()][right.toLowerCase()]
    }

    const profilesArr = (await yaxys.db.findOne(
      "operator",
      { id: operator.id },
      null,
      null,
      [],
      [{
        linkerModel: "operatorProfileBinding",
        initialModel: "operator",
        modelToLink: "operatorProfile",
      }])).operatorProfile

    for (let profile of profilesArr) {
      if (profile.rights
        && profile.rights[modelKey.toLowerCase()]
        && profile.rights[modelKey.toLowerCase()][right.toLowerCase()]
      ) {
        return true
      }
    }
    return false
  },
}
