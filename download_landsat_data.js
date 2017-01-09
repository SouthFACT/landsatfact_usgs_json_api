/**
 * 
 * 
 */

///////////////////////////////////////////////////////////////////////////////

// Libraries
var yaml = require('yamljs')
var pg = require('pg')
var fs = require('fs')
var winston = require('winston')
var axios = require('axios')
var request = require('request')
var Promise = require('bluebird')
Promise.longStackTraces()

// Modules
var usgs_constants = require("./lib/usgs_api/usgs_constants.js")
var usgs_functions = require("./lib/usgs_api/usgs_functions.js")
var usgs_helpers = require("./lib/usgs_api/usgs_helpers.js")
var pg_handler = require('./lib/postgres/postgres_handlers.js')
var app_helpers = require('./lib/helpers/app_helpers.js')()

// Constants for handling USGS API
const USGS_DL_RESPONSE_CODE = usgs_helpers.get_usgs_response_code('download')
const MAX_SINGLE_REQUEST_ATTEMPTS = 5
const SCENE_BATCH_LIMIT = 5
const USGS_DL_PRODUCTS = ['STANDARD']

// Base URL for http promise library
axios.defaults.baseURL = usgs_constants.USGS_URL

// USGS API key promise
var api_key_promise = usgs_helpers.get_api_key()

// Database connection
const db_config = yaml.load("./lib/postgres/config.yaml")
var pg_pool = pg_handler.pg_pool(db_config)

// Logging
const TODAY_DATE = app_helpers.get_date_string()
const LOG_LEVEL_INFO = 'info'
const LOG_LEVEL_ERROR = 'error'
const LOG_FILE = 'download_landsat_data' + TODAY_DATE

app_helpers.delete_old_files(LOG_FILE, 'logs/', '.log')
app_helpers.set_logger_level('debug')
app_helpers.set_logfile(LOG_FILE)
app_helpers.write_message(LOG_LEVEL_INFO, 'START '+LOG_FILE, '')


///////////////////////////////////////////////////////////////////////////////////

/**
 * What if we just get 5 records at at time,
 * since we're running the script several times a day anyway?
 *
 */

// Initial SELECT query
const query_text = "SELECT * FROM landsat_metadata WHERE needs_ordering = 'NO' LIMIT 5"

const main = function() {
  if (process.argv[2]) {
    const scenes = process.argv[2]
    query_text = "SELECT * FROM landsat_metadata WHERE needs_ordering = 'NO' AND scene_id in "
      + app_helpers.list_array_to_sql_list(scenes)
  }
  pg_handler.pool_query_db(pg_pool, query_text, [], function (query_result) {
    var scenes_by_dataset = usgs_helpers.sort_scene_records_by_dataset(query_result.rows)
    var dataset_names = usgs_constants.LANDSAT_DATASETS
    usgs_helpers.process_scenes_by_dataset(dataset_names, scenes_by_dataset, process_scenes_for_dataset)
  })

}

const process_scenes_for_dataset = function (dataset_name, scenes) {
  return api_key_promise.then(function (apiKey) {
    const scene_id = scenes.pop()
    return process_scene(dataset_name, scene_id, apiKey).then(function() {
      if (scenes.length) {
        return process_scenes_for_dataset(dataset_name, scenes)
      }
    })
  }).catch(function (err) {
    app_helpers.write_message(
      LOG_LEVEL_ERROR,
      'ERROR retrieving api key',
      err.stack
    )
  })
}

const process_scene = function (dataset_name, scene_id, apiKey) {
  const request_body = usgs_functions.usgsapi_download(
    apiKey,
    usgs_constants.NODE_EE,
    dataset_name,
    USGS_DL_PRODUCTS,
    [scene_id]
  )
  return usgs_helpers.get_usgsapi_response(
    USGS_DL_RESPONSE_CODE,
    request_body
  ).catch(function (err) {
    app_helpers.write_message(LOG_LEVEL_ERROR, err.stack)
  }).then(function (response) {
    start_download(scene_id, response[0])
  })

}

// TODO handle various http codes
const start_download = function (scene_id, url) {
  request
    .get(url)
    .on('error', function (err) {
      app_helpers.write_message(LOG_LEVEL_ERROR, err)
    })
    .pipe(fs.createWriteStream('./downloads/'+scene_id+'.tar.gz'))
}

main()

