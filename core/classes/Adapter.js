const knex = require("knex")
const _ = require("lodash")
const EventEmitter = require("promise-events")
const config = require("config")
const Ajv = require("ajv")
const ajv = new Ajv({ format: "full" })

const DEFAULT_OPTIONS = {
  limit: 100,
  select: "*",
  sort: {
    id: 1,
  },
}

const STD_PROPERTIES = {
  id: {
    type: "integer",
  },
  createdAt: {
    type: "string",
    format: "date-time",
    hidden: true,
    default: "NOW()",
  },
  updatedAt: {
    type: "string",
    format: "date-time",
    hidden: true,
    default: "NOW()",
  },
}

const POSTGRES_TYPES = [
  "integer",
  "bigInteger",
  "text",
  "string",
  "float",
  "decimal",
  "boolean",
  "date",
  "dateTime",
  "time",
  "binary",
  "json",
  "jsonb",
  "uuid",
  "timestamp",
]

const NUMERIC_JSON_SCHEMA_TYPES = new Set([
  "integer",
  "number",
])

module.exports = class Adapter {

  constructor(config, options) {
    this.knex = knex({
      client: "pg",
      connection: config,
    })
    this.options = Object.assign({}, DEFAULT_OPTIONS, options)
    this.schemas = {}
    this.emitter = new EventEmitter()
  }

  /**
   * Init the adapter by performing simple async query.
   * Knex doesn't actually perform connections and other async operatons before the first query
   */
  async init() {
    await this.knex.raw("select now();")
  }

  /**
   * Register db listener
   * @param {String} event The event to listen
   * @param {Function} listener The listener
   */
  async on(event, listener) {
    await this.emitter.on(event, listener)
  }

  /**
   * Sanitize the data using model's schema before updating or inserting
   * @param {String} identity The models' identity
   * @param {Object} data The data to sanitize
   * @returns {Object} The sanitized data
   * @private
   */
  _sanitize(identity, data) {
    const schema = this.schemas[identity]
    if (!schema) {
      throw new Error(yaxys.t("Adapter.SCHEMA_NOT_FOUND", { identity }))
    }
    if (!data) {
      throw new Error(yaxys.t("Adapter.DATA_REQUIRED"))
    }
    if (typeof data !== "object") {
      throw new Error(yaxys.t("Adapter.DATA_OBJECT_EXPECTED"))
    }
    if (Array.isArray(data)) {
      throw new Error(yaxys.t("Adapter.DATA_NOT_ARRAY"))
    }

    return _.mapValues(data, (value, key) => {
      let property = schema.properties[key]
      if (!property) {
        switch (key) {
          case "id":
            property = STD_PROPERTIES.id
            break
          case "createdAt":
          case "updatedAt":
            if (schema.timestamps) {
              property = STD_PROPERTIES[key]
            }
            break
        }
      }
      if (property.virtual) {
        return undefined
      }
      switch (property && property.type) {
        case "object":
          return typeof value === "string" ? JSON.stringify(value) : value
        case "number":
        case "integer":
          if (
            property.connection &&
            property.connection.type === "m:1" &&
            typeof value === "object" &&
            value
          ) {
            return value.id
          }
          return typeof value === "string" ? Number(value) : value
        case "string":
          if (property.format === "date-time" && value instanceof Date) {
            return value.toISOString()
          }
          return value
      }
      return value
    })
  }

  /**
   * Register given schema into the schemas' registry
   * @param {String} identity The model's identity
   * @param {Object} schema The schema to register
   */
  registerSchema(identity, schema) {
    this.schemas[identity.toLowerCase()] = schema
    this.schemas[identity.toLowerCase()].validator = ajv.compile(schema)
  }

  /**
   * Validate data using ajv
   * @param {String} identity Identity of schema to validate
   * @param {Object} data Data to validate
   * @returns {{passed: boolean, errors: Array<ajv.ErrorObject>}} The result of validation
   * @private
   */
  _validate(identity, data) {
    const passed = this.schemas[identity.toLowerCase()].validator(data)
    return { passed: passed, errors: this.schemas[identity.toLowerCase()].validator.errors }
  }

  /**
   * Insert new model into the table
   * @param {Object} trx The transaction context
   * @param {String} identity The model's identity
   * @param {Object} data The model blank to insert
   * @param {Object} [options] The options to find
   * @returns {Promise<Object>} The inserted model containing all of the fields, including id
   */
  async insert(trx, identity, data, options = {}) {
    const dataToInsert = data.id ? data : _.omit(data, "id")

    const fixedData = this._sanitize(identity, dataToInsert)

    const validation = this._validate(identity, _.omitBy(fixedData, _.isNil))
    if (!validation.passed) {
      throw new Error(yaxys.t("Adapter.VALIDATION_FAIL", {
        property: validation.errors[0].dataPath,
        message: validation.errors[0].message,
      }))
    }

    await this.emitter.emit(`${identity}:create:before`, trx, fixedData)
    try {
      const insert = this.knex(identity)
        .insert(fixedData)
        .returning("*")
      const result = trx ? await insert.transacting(trx) : await insert
      const item = result[0]
      await this.emitter.emit(`${identity}:create:after`, trx, item)
  
      if (options && options.populate) {
        const propertiesToPopulate = Array.isArray(options.populate)
          ? options.populate
          : [options.populate]
  
        for (let property of propertiesToPopulate) {
          await this._populate(identity, [item], property, trx)
        }
      }
      return item
    } catch (error) {
      throw new Error(error.detail);
    }
  }

  /**
   * Update the model by it's id
   * @param {Object} trx The transaction context
   * @param {String} identity The model's identity
   * @param {String|Integer} id  Model's id
   * @param {Object} data new The patch for the model's instance
   * @returns {Promise<Object>} The inserted model containing all of the fields, includeing id
   */
  async update(trx, identity, id, data) {
    const schema = this.schemas[identity.toLowerCase()]
    if (!id) {
      throw new Error(yaxys.t("Adapter_ID_REQUIRED"))
    }
    const fixedData = this._sanitize(identity, data)
    const old = await this.findOne(trx, identity, { id })

    if (!old) {
      throw new Error(yaxys.t("Adapter.ID_NOT_FOUND", { id }))
    }

    const patchedData = this._sanitize(identity, _.omitBy(Object.assign(old, fixedData), _.isNil))
    const validation = this._validate(identity, patchedData)
    if (!validation.passed) {
      throw new Error(yaxys.t("Adapter.VALIDATION_FAIL", {
        property: validation.errors[0].dataPath,
        message: validation.errors[0].message,
      }))
    }

    await this.emitter.emit(`${identity}:update:before`, trx, old, fixedData)

    if (schema.timestamps) {
      fixedData.updatedAt = new Date().toISOString()
    }
    const update = this.knex(identity)
      .where({ id })
      .update(fixedData)
      .returning("*")
    const result = trx ? await update.transacting(trx) : await update

    const item = result[0]
    await this.emitter.emit(`${identity}:update:after`, trx, old, item)

    return item
  }

  /**
   * Delete the model by it's id
   * @param {Object} trx The transaction context
   * @param {String} identity The model's identity
   * @param {String|Integer} id  Model's id
   * @returns {Promise<Object>} The deleted model instance
   */
  async delete(trx, identity, id) {
    if (!id) {
      throw new Error(yaxys.t("Adapter_ID_REQUIRED"))
    }

    const old = await this.findOne(trx, identity, { id }, {})
    await this.emitter.emit(`${identity}:delete:before`, trx, old)

    const deleteQuery = this.knex(identity)
      .where({ id })
      .del()

    await (trx ? deleteQuery.transacting(trx) : deleteQuery)

    await this.emitter.emit(`${identity}:delete:after`, trx, old)

    return old
  }

  /**
   * Find the first model matching the filter
   * @param {Object} trx The transaction context
   * @param {String} identity The model's identity
   * @param {Object} filter The filter to match
   * @param {Object} [options] The options to find
   * @returns {Promise<Object|undefined>} The model found or undefined
   */
  async findOne(trx, identity, filter, options = {}) {
    return (await this.find(trx, identity, filter, Object.assign({ limit: 1 }, options)))[0]
  }

  _sanitizeFilterValue(value, property) {
    if (property) {
      if (NUMERIC_JSON_SCHEMA_TYPES.has(property.type)) {
        return Number(value)
      }
      if (property.format === "date-time") {
        return new Date(value.replace(/\s([0-9]{0,2})$/, "+$1"))
      }
    }
    return value
  }

  /**
   * Apply filter to the query
   * @param {Object} initialQuery The initial query
   * @param {String} identity The model's identity
   * @param {Object} filter The filter to apply to initialQuery
   * @returns {Object} The new query with applied filter
   * @private
   */
  _applyFilter(initialQuery, identity, filter) {
    const schema = this.schemas[identity.toLowerCase()]

    let query = initialQuery
    const simpleWhere = {}
    _.each(filter, (value, key) => {
      if(key === 'search') {
        const fd = JSON.parse(value).filterValue;
        _.each(JSON.parse(value).filterKeys, (v, k) => {
          if(k === 0) {
            query.where(v, 'like', `%${fd}%`)
            return
          }
          query.orWhere(v, 'like', `%${fd}%`)
        })
        return
      }
      const property = schema.properties[key]
      if (Array.isArray(value) && property.type !== "array") {
        query = query.andWhere(key, "in", value)
        return
      }

      const isComparable = property && (NUMERIC_JSON_SCHEMA_TYPES.has(property.type) || property.format === "date-time")
      if (isComparable && /^[><=]{1,2}:/.test(value)) {
        const [predicate, ...valueParts] = value.split(":")
        query = query.andWhere(key, predicate, this._sanitizeFilterValue(valueParts.join(":"), property))
        return
      }
      simpleWhere[key] = this._sanitizeFilterValue(value, property)
    })
    query = query.andWhere(simpleWhere)

    return query
  }

  /**
   * Find models matching the criteria
   * @param {Object} trx The transaction context
   * @param {String} identity The model's identity
   * @param {Object} filter The filter to match
   * @param {Object} [options] The options to find
   * @returns {Promise<Array<Object>>} The array of found models
   */
  async find(trx, identity, filter, options = {}) {
    let query = this._applyFilter(this.knex(identity), identity, filter)
    _.each(Object.assign({}, this.options, options), (value, key) => {
      switch (key) {
        case "limit":
        case "select":
          query = query[key](value)
          break
        case "offset":
        case "skip":
          query = query.offset(value)
          break
        case "sort":
          _.each(value, (v, k) => {
            query = query.orderBy(k, Number(v) === -1 ? "desc" : "asc")
          })
          break
      }
    })
    let result = await (trx ? query.transacting(trx) : query)
    if (options.populate) {
      const propertiesToPopulate = Array.isArray(options.populate)
        ? options.populate
        : [options.populate]

      for (let property of propertiesToPopulate) {
        await this._populate(identity, result, property, trx)
      }
    }
    return result
  }

  /**
   * Count the number of models of some identity
   * @param {Object} [trx] The transaction context
   * @param {String} identity The identity of model
   * @param {Object} filter The filter to match
   * @returns {Promise<number>} The number of models
   */
  async count(trx, identity, filter) {
    const query = this._applyFilter(this.knex(identity), identity, filter).count("*")
    const result = await (trx ? query.transacting(trx) : query)
    return result[0].count
  }

  /** Populates the given models with 1:m relation
   * @param {String} identity The initial model identity
   * @param {Object[]} models Models to be populated
   * @param {String} property The property to populate
   * @param {Object} [trx] The transaction context
   * @private
   */
  async _populate(identity, models, property, trx) {
    const schema = this.schemas[identity.toLowerCase()]
    const propertySchema = schema.properties[property]

    const connection = propertySchema.connection

    switch (connection.type) {
      case "m:m": {
        const linkerSchema = this.schemas[connection.linkerModel.toLowerCase()]
        const relatedIdentity =
          linkerSchema.properties[connection.linkerRelatedAttribute].connection.relatedModel

        const ids = [...new Set(models.map(model => model.id))]
        const linkerModels = await this.knex(connection.linkerModel.toLowerCase())
            .whereIn(connection.linkerMyAttribute, ids)
            .orderBy("id", "asc")

        const relatedIds = [
          ...new Set(linkerModels.map(model => model[connection.linkerRelatedAttribute])),
        ]
        const relatedModels = await this.knex(relatedIdentity.toLowerCase()).whereIn("id", relatedIds)
        const relatedHash = relatedModels.reduce((hash, relatedItem) => {
          hash[relatedItem.id] = relatedItem
          return hash
        }, {})

        const relatedByMyIdHash = linkerModels.reduce((hash, linkerItem) => {
          const myId = linkerItem[connection.linkerMyAttribute]
          if (!hash[myId]) {
            hash[myId] = []
          }
          const relatedItem = {
            ...relatedHash[linkerItem[connection.linkerRelatedAttribute]],
            _binding_id: linkerItem.id,
          }
          hash[myId].push(relatedItem)
          return hash
        }, {})

        for (let model of models) {
          model[property] = relatedByMyIdHash[model.id] || []
        }

        break
      }
      case "m:1": {
        const ids = [...new Set(models.map(model => model[property]))]

        const relatedModels = await this.knex(connection.relatedModel.toLowerCase()).whereIn("id", ids)

        const relatedHash = relatedModels.reduce((hash, relatedItem) => {
          hash[relatedItem.id] = relatedItem
          return hash
        }, {})

        for (let model of models) {
          if (relatedHash[model[property]]) {
            model[property] = relatedHash[model[property]]
          }
        }
        break
      }
      case "1:m": {
        const ids = [...new Set(models.map(model => model.id))]

        const relatedModels = await this.knex(connection.relatedModel.toLowerCase())
            .whereIn(connection.relatedModelAttribute, ids)
            .orderBy("id", "asc")

        const relatedByMyIdHash = relatedModels.reduce((hash, relatedItem) => {
          const myId = relatedItem[connection.relatedModelAttribute]
          if (!hash[myId]) {
            hash[myId] = []
          }
          hash[myId].push(relatedItem)
          return hash
        }, {})

        for (let model of models) {
          model[property] = relatedByMyIdHash[model.id] || []
        }
        break
      }
      default:
        throw new Error(yaxys.t("Adapter.INVALID_CONNECTION"))
    }
  }

  /**
   * Create the knex promise which, when called then(), will create the table for given model
   * @param {String} identity The model's identity
   * @param {Object} schema The model's schema
   * @returns {{ then: Function }} The knex promise
   * @private
   */
  _newTable(identity, schema) {
    return this.knex.schema.createTable(identity, table => {
      table.increments("id").primary()
      _.forEach(schema.properties, (property, key) => {
        if (key === "id" || property.virtual) return

        const type = ["object", "array"].includes(property.type)
          ? "json"
          : (property.type === "string" && property.format === "date-time")
            ? "timestamp"
            : property.type

        if (!POSTGRES_TYPES.includes(type)) {
          throw new Error(yaxys.t("Adapter.INCORRECT_DATA_TYPE", {
            type,
            field: key,
            identity,
          }))
        }
        const attribute = table[type](key)
        if (Array.isArray(schema.required) && schema.required.includes(key)) {
          attribute.notNullable()
        }
        if (property.hasOwnProperty("default")) {
          attribute.defaultTo(
            property.format === "date-time" && property.default === "NOW()"
              ? this.knex.fn.now(3)
              : property.default
          )
        }
        if (property.unique) {
          table.unique(key)
        }
      })
      if (schema.uniqueKeys && typeof schema.uniqueKeys === "object") {
        _.forEach(schema.uniqueKeys, value => table.unique(value))
      }
    })
  }

  /**
   * Create the table for given model
   * @param {String} identity The model's identity
   * @param {Object} schema The model's schema
   */
  async createTable(identity, schema) {
    await this._newTable(identity, schema)//.then()
  }

  /**
   * Drop the given table
   * @param {String} identity The table identity
   */
  async dropTable(identity) {
    if (!config.get("test")) {
      throw new Error("Calling dropTable is forbidden when not in test mode")
    }
    return this.knex.schema.dropTable(identity)
  }

  /**
   * Clear the given table
   * @param {String} identity The table identity
   */
  async clearTable(identity) {
    if (!config.get("test")) {
      throw new Error("Calling clearTable is forbidden when not in test mode")
    }
    return this.knex.truncate(identity)
  }

  /**
   * Get the SQL for creating the table of the given model
   * @param {String} identity The model's identity
   * @param {Object} schema The model's schema
   * @returns {String} The SQL
   */
  getSQLForCreateTable(identity, schema) {
    return this._newTable(identity, schema).toString()
  }

  /**
   * Gracefully shutdown the adapter
   */
  async shutdown() {
    await this.knex.destroy()
  }
}
module.exports.STD_PROPERTIES = STD_PROPERTIES
