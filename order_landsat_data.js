/**
 * Order level 1 products for landsat scenes.
 *
 */

/////////////////////////////////////////////////////////////////////

// Libraries
var yaml = require('yamljs')
var pg = require('pg')
var fs = require('fs')
var winston = require('winston')
var axios = require('axios')
var Promise = require('bluebird')
Promise.longStackTraces()

// Modules
var usgs_constants = require("./lib/usgs_api/usgs_constants.js")
var usgs_functions = require("./lib/usgs_api/usgs_functions.js")
var usgs_helpers = require("./lib/usgs_api/usgs_helpers.js")
var pg_handler = require('./lib/postgres/postgres_handlers.js')
var app_helpers = require('./lib/helpers/app_helpers.js')()

// Settings for USGS
const CONFIG_YAML = yaml.load('./lib/usgs_api/config.yaml')

// Base URL for http promise library
axios.defaults.baseURL = usgs_constants.USGS_URL

// USGS API key promise
var api_key_promise = usgs_helpers.get_api_key()

// Database connection
const db_config = yaml.load("./lib/postgres/config.yaml")
var pg_pool = pg_handler.pg_pool(db_config)

// Logging
const LOG_LEVEL_INFO = 'info'
const LOG_LEVEL_ERROR = 'error'
const LOG_FILE = 'order_landsat_data'

app_helpers.delete_old_files(LOG_FILE, 'logs/', '.log')
app_helpers.set_logger_level('debug')
app_helpers.set_logfile(LOG_FILE)
app_helpers.write_message(LOG_LEVEL_INFO, 'START '+LOG_FILE, '')

// SQL queries
const query_text = "SELECT * FROM landsat_metadata WHERE "
  + "needs_ordering = 'YES' "
  + "AND (ordered = 'NO' or ordered IS NULL or ordered = '') "
  + "LIMIT 100"

// Constants for handling the USGS API
const USGS_DL_PRODUCTS = ['STANDARD']
const USGS_GET_ORDER_PRODUCTS_CODE = usgs_helpers.get_usgs_response_code(
  'getorderproducts'
)
const USGS_UPDATE_ORDER_SCENE_CODE = usgs_helpers.get_usgs_response_code(
  'updateorderscene'
)
const USGS_SUBMIT_ORDER_CODE = usgs_helpers.get_usgs_response_code(
  'submitorder'
)

const GET_ORDER_PRODUCTS_SCENE_BATCH_LIMIT = 100

var scenes_ordered = []

///////////////////////////////////////////////////////////////////////////////////

const main = function () {
  var dataset_names = usgs_constants.LANDSAT_DATASETS.slice()
  pg_handler.pool_query_db(pg_pool, query_text, [], function (query_result) {
    var scenes_by_dataset = usgs_helpers.sort_scene_records_by_dataset(
      query_result.rows
    )
    usgs_helpers.process_scenes_by_dataset(
      dataset_names,
      scenes_by_dataset,
      process_scenes_for_dataset
    )
  })
}


/**
 * Process scenes for a single landsat dataset.
 *
 * @param dataset_name the name of the dataset to which the scenes
 *    being processed belong.
 * @param scenes is a list of scene records from the metadata table.
 * 
 */
const process_scenes_for_dataset = function (dataset_name, scenes) {
  if (scenes && scenes.length) {
    return api_key_promise.then(function (apiKey) {
      var scene_batch = scenes.slice(0, GET_ORDER_PRODUCTS_SCENE_BATCH_LIMIT)
      return process_scene_batch(dataset_name, scene_batch, apiKey)
    }).catch(function (err) {
      app_helpers.write_message(
        LOG_LEVEL_ERROR,
        'ERROR retrieving api key',
        err.stack
      )
    }).then(function() {
      scenes = scenes.slice(GET_ORDER_PRODUCTS_SCENE_BATCH_LIMIT)
      return process_scenes_for_dataset(dataset_name, scenes)
    })

  }
}

/**
 * Process and submit an order for a batch of scenes.
 *
 * @param dataset_name
 * @param scene_batch is a list of 
 *
 */
const process_scene_batch = function (dataset_name, scene_batch, apiKey) {
  return get_order_products(
    dataset_name,
    scene_batch,
    apiKey
  ).then(function (response) {
    if (response && response.length) {
      return update_order_scenes(
        dataset_name,
        response,
        apiKey
      ).then(function () {
        return submit_order(apiKey).then(function () {
          update_db()
        })
      })
    }
    else {
      app_helpers.write_message(
        LOG_LEVEL_INFO,
        'No level 1 products available to order for scene batch in dataset',
        dataset_name
      )
    }
  })
}

/**
 * Get orderable level 1 products for a batch of scenes.
 *
 */
const get_order_products = function (dataset_name, scene_batch, apiKey) {
  const request_body = usgs_functions.usgsapi_getorderproducts(
    apiKey,
    usgs_constants.NODE_EE,
    dataset_name,
    scene_batch
  )
  app_helpers.write_message(
    LOG_LEVEL_INFO,
    'Getting order products for scene batch in dataset',
    dataset_name
  )
  return usgs_helpers.get_usgsapi_response(
    USGS_GET_ORDER_PRODUCTS_CODE,
    request_body
  ).then(function (response) {
    return filter_order_products(response)
  }).catch(function (err) {
    app_helpers.write_message(
      LOG_LEVEL_ERROR,
      err.stack
    )
  })
}

/**
 * Filter a list of order products for the types we need.
 *
 * @param response is a list of order products 
 *
 */
const filter_order_products = function (response) {
  return response.filter( scene => {
    scene.availableProducts = scene.availableProducts.filter( order_product => {
      return order_product.price === 0 &&
        order_product.productCode.substring(0,1) !== 'W' &&
        order_product.outputMedias[0] === "DWNLD"
    })
    if (scene.availableProducts.length > 1) {
      app_helpers.write_message(
        LOG_LEVEL_INFO,
        'Multiple level 1 products available for scene',
        scene.entityId
      )
    }
    return scene.availableProducts.length > 0
  })
}


/**
 * Update the order item basket with a batch of level 1 order products.
 *
 */
const update_order_scenes = function (dataset_name, order_products, apiKey) {
  if (order_products && order_products.length) {
    const scene_order = order_products.pop()
    const ordering_id = scene_order.orderingId
    const product_code = scene_order.availableProducts[0].productCode
    const option = 'None'
    const output_media = 'DWNLD'
    const request_body = usgs_functions.usgsapi_updateorderscene(
      apiKey,
      usgs_constants.NODE_EE,
      dataset_name,
      product_code,
      output_media,
      option,
      ordering_id
    )
    return usgs_helpers.get_usgsapi_response(
      USGS_UPDATE_ORDER_SCENE_CODE,
      request_body
    ).catch(function (err) {
      app_helpers.write_message(LOG_LEVEL_ERROR, err.stack)
    }).then(function (response) {
      app_helpers.write_message(
        LOG_LEVEL_INFO,
        'SUCCESS Added scene to order item basket',
        scene_order.entityId
      )
      scenes_ordered.push(scene_order.entityId)
      return update_order_scenes(dataset_name, order_products, apiKey)
    })
  }
}

/**
 * Submit the current order.
 *
 * Sends a 'submitorder' request to the USGS API.
 * This tells USGS to make downloads available
 * for all items in the current order item basket.
 * The order item basket is then cleared.
 *
 */
const submit_order = function (apiKey) {
  const request_body = usgs_functions.usgsapi_submitorder(
    apiKey,
    usgs_constants.NODE_EE
  )
  return usgs_helpers.get_usgsapi_response(
    USGS_SUBMIT_ORDER_CODE,
    request_body
  ).then(function (order_number) {
    if (order_number) {
      app_helpers.write_message(
        LOG_LEVEL_INFO,
        'DONE Order submitted. Order number is',
        order_number
      )
    }
    else {
      app_helpers.write_message(
        LOG_LEVEL_ERROR,
        'ERROR Problem with order submission. No order number returned.'
      )
    }
  })
}


/**
 * Update scene records in the metadata table
 * to reflect that they were successfully ordered.
 *
 */
const update_db = function () {
  if (scenes_ordered.length) {
    const query_text = "UPDATE landsat_metadata "
      + "SET "
        + "needs_ordering = 'NO', "
        + "ordered = 'YES' "
      + "WHERE scene_id IN "
        + app_helpers.list_array_to_sql_list(scenes_ordered)
    pg_handler.pool_query_db(pg_pool, query_text, [], function () {
      app_helpers.write_message(
        LOG_LEVEL_INFO,
        'DONE Database updated for ' + scenes_ordered.length + ' ordered scenes.'
      )
    })    
  }
  else {
    app_helpers.write_message(
      LOG_LEVEL_ERROR,
      'ERROR Database not updated. No scenes successfully ordered.'
    )
  }
}


main()