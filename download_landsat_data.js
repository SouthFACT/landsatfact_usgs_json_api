/**
 * 
 * 
 */

////////////////////// Configuration ////////////////////////////////////

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

// Constants for handling USGS API
const USGS_DL_RESPONSE_CODE = usgs_helpers.get_usgs_response_code('download')
const MAX_SINGLE_REQUEST_ATTEMPTS = 5
const SCENE_BATCH_LIMIT = 10000
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




//////////////////////////////////////////////////////////////////////////////////

////////////////////// Ground Control ////////////////////////////////////////////

// 10 download requests at a time
// (but really, do 5)
// 
// Error Codes
// DOWNLOAD_ERROR  An error occurred while looking up downloads
// DOWNLOAD_RATE_LIMIT The number of unattampted downloads has been exceeded

// 1985 scene, needs_ordering = null
// LT50180351985215AA006
// LT50180381985215AA005

// Initial SELECT query
const query_last_days_scenes = "SELECT * FROM vw_last_days_scenes"

const main = function() {
  pg_handler.pool_query_db(pg_pool, query_last_days_scenes, [], function (query_result) {
    console.log(query_result.rows)
    //process_result(query_result)
  })

}

const process_result = function (query_result) {
  if (query_result.rows && query_result.rows.length) {
    const scenes_by_dataset = usgs_helpers.sort_records_by_dataset(query_result.rows)
    process_scenes
    get_download_urls(query_result.rows).then(function (download_urls) {

    })
  }
  else {
    app_helpers.write_message(LOG_LEVEL_ERROR, 'ERROR view query for last days scenes returned no records')
  }
}

const get_download_urls = function (scenes) {
  const request_body = usgs_function.usgsapi_download(apiKey, usgs_constants.NODE_EE, datasetName, products, entityIds)
  return usgs_helpers.get_usgsapi_response
}


main()

/*
pg_handler.pool_query_db(pg_pool, query_last_days_scenes, [], function(query_result) {
  process_result(query_result)
})
*/
