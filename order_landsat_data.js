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

// Logging
const LOG_FILE = 'order_landsat_data'
var logger = require('./lib/helpers/logger.js')(LOG_FILE)
// Set here so modules can see in require.main.exports
module.exports.logger = logger

// Modules
var usgs_constants = require("./lib/usgs_api/usgs_constants.js")
var usgs_functions = require("./lib/usgs_api/usgs_functions.js")
var usgs_helpers = require("./lib/usgs_api/usgs_helpers.js")
var pg_handler = require('./lib/postgres/postgres_handlers.js')
var app_helpers = require('./lib/helpers/app_helpers.js')()

// Settings for USGS
const USGS_CONFIG = app_helpers.get_usgs_config()

// Base URL for http promise library
axios.defaults.baseURL = usgs_constants.USGS_URL

// USGS API key promise
var api_key_promise = usgs_helpers.get_api_key()

// Database connection
const db_config = app_helpers.get_db_config()
var pg_pool = pg_handler.pg_pool(db_config)

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

module.exports = {
  main,
  process_scenes_for_dataset,
  process_scene_batch,
  get_order_products,
  filter_order_products,
  update_order_scenes,
  submit_order,
  update_db,
  logger
}

// Run main function if script is run from commandline
if (require.main === module) main()


///////////////////////////////////////////////////////////////////////////////////

function main () {
  var dataset_names = usgs_constants.LANDSAT_DATASETS.slice()
  pg_handler.pool_query_db(pg_pool, query_text, [], function (query_result) {
    if (query_result.rows && query_result.rows.length) {
      var scenes_by_dataset = usgs_helpers.sort_scene_records_by_dataset(
        query_result.rows
      )
      usgs_helpers.process_scenes_by_dataset(
        dataset_names,
        scenes_by_dataset,
        process_scenes_for_dataset
      )      
    }
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
function process_scenes_for_dataset (dataset_name, scenes) {
  if (scenes && scenes.length) {
    return api_key_promise.then(function (apiKey) {
      var scene_batch = scenes.slice(0, GET_ORDER_PRODUCTS_SCENE_BATCH_LIMIT)
      return process_scene_batch(dataset_name, scene_batch, apiKey)
    }).catch(function (err) {
      logger.log(
        logger.LEVEL_ERROR,
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
function process_scene_batch (dataset_name, scene_batch, apiKey) {
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
    } else {
      logger.log(
        logger.LEVEL_INFO,
        'INFO No level 1 products available to order for scene batch in dataset',
        dataset_name
      )
    }
  })
}

/**
 * Get orderable level 1 products for a batch of scenes.
 *
 */
function get_order_products (dataset_name, scene_batch, apiKey) {
  const request_body = usgs_functions.usgsapi_getorderproducts(
    apiKey,
    usgs_constants.NODE_EE,
    dataset_name,
    scene_batch
  )
  logger.log(
    logger.LEVEL_INFO,
    'START get order products for scene batch in dataset',
    dataset_name
  )
  return usgs_helpers.get_usgsapi_response(
    USGS_GET_ORDER_PRODUCTS_CODE,
    request_body
  ).then(function (response) {
    return filter_order_products(response)
  }).catch(function (err) {
    logger.log(
      logger.LEVEL_ERROR,
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
function filter_order_products (response) {
  if (response && response.length) {
    return response.filter( scene => {
      scene.availableProducts = scene.availableProducts
        .filter( order_product => {
          return order_product.price === 0 &&
                 order_product.productCode.substring(0,1) !== 'W' &&
                 order_product.outputMedias[0] === "DWNLD"
        })
      if (scene.availableProducts.length > 1) {
        logger.log(
          logger.LEVEL_INFO,
          'INFO Multiple level 1 products available for scene',
          scene.entityId
        )
      }
      return scene.availableProducts.length > 0
    })
  }
}


/**
 * Update the order item basket with a batch of level 1 order products.
 *
 */
function update_order_scenes (dataset_name, order_products, apiKey) {
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
      logger.log(logger.LEVEL_ERROR, err.stack)
    }).then(function (response) {
      logger.log(
        logger.LEVEL_INFO,
        'DONE Added scene to order item basket',
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
function submit_order (apiKey) {
  const request_body = usgs_functions.usgsapi_submitorder(
    apiKey,
    usgs_constants.NODE_EE
  )
  return usgs_helpers.get_usgsapi_response(
    USGS_SUBMIT_ORDER_CODE,
    request_body
  ).then(function (order_number) {
    if (order_number) {
      logger.log(
        logger.LEVEL_INFO,
        'DONE Order submitted. Order number is',
        order_number
      )
    } else {
      logger.log(
        logger.LEVEL_ERROR,
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
function update_db () {
  if (scenes_ordered.length) {
    const query_text = "UPDATE landsat_metadata "
      + "SET "
        + "needs_ordering = 'NO', "
        + "ordered = 'YES' "
      + "WHERE scene_id IN "
        + app_helpers.list_array_to_sql_list(scenes_ordered)
    pg_handler.pool_query_db(pg_pool, query_text, [], function () {
      logger.log(
        logger.LEVEL_INFO,
        'DONE Database updated for ' + scenes_ordered.length + ' ordered scenes.'
      )
    })    
  } else {
    logger.log(
      logger.LEVEL_ERROR,
      'ERROR Database not updated. No scenes successfully ordered.'
    )
  }
}
