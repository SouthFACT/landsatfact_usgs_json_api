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
var usgs_helper = require("./lib/usgs_api/usgs_helpers.js")
var pg_handler = require('./lib/postgres/postgres_handlers.js')
var app_helpers = require('./lib/helpers/app_helpers.js')()

// Constants for handling USGS API
const DL_OPTION_DOWNLOAD_CODE = "STANDARD"
const DL_USGS_RESPONSE_CODE = usgs_helper.get_usgs_response_code('download')
const MAX_SINGLE_REQUEST_ATTEMPTS = 5

// Base URL for http promise library
axios.defaults.baseURL = usgs_constants.USGS_URL

// USGS API key promise
var get_api_key = usgs_helper.get_api_key()

// Database connection
const db_config = yaml.load("./lib/postgres/config.yaml")
var pg_pool = pg_handler.pg_pool(db_config)

// Logging
const TODAY_DATE = app_helpers.get_date_string()
const LOG_LEVEL_INFO = 'info'
const LOG_LEVEL_ERROR = 'error'
const LOG_FILE = 'update_scenes_to_order_' + TODAY_DATE

app_helpers.delete_old_files(LOG_FILE, 'logs/', '.log')
app_helpers.set_logger_level('debug')
app_helpers.set_logfile(LOG_FILE)
app_helpers.write_message(LOG_LEVEL_INFO, 'START '+LOG_FILE, '')




//////////////////////////////////////////////////////////////////////////////////

////////////////////// Ground Control ////////////////////////////////////////////

// 10 download requests at a time
// (but really, do 5)

// Initial SELECT query
const query_text = "SELECT * FROM vw_last_days_scenes"


pg_handler.pool_query_db(pg_pool, query_text, [], function(query_result) {
  console.log(query_result.rows)
})






