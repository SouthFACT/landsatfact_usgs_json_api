/**
 * Download landsat products.
 *
 * Command-line arguments are interpreted as scene ids.
 * If arguments are provided, then only download those scenes.
 *
 * If no arguments are provided, download 10 scenes from
 * the last days scenes sql view.
 *
 */

/////////////////////////////////////////////////////////////////////

// Libraries
var yaml = require('yamljs')
var pg = require('pg')
var fs = require('fs')
var winston = require('winston')
var axios = require('axios')
var request = require('request')
var Promise = require('bluebird')
Promise.longStackTraces()

// Logging
const LOG_FILE = 'download_landsat_data'
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
const last_days_scenes_query_text = "SELECT * FROM vw_last_days_scenes "
  + "LIMIT 10"

const custom_request_query_template = ""
  + "SELECT * FROM landsat_metadata "
  + "WHERE needs_ordering = 'NO' "
  + "AND scene_id IN "

// Constants for handling the USGS API
const USGS_DL_RESPONSE_CODE = usgs_helpers.get_usgs_response_code('download')
const CONCURRENT_DL_LIMIT = 10
const USGS_DL_PRODUCTS = ['STANDARD']
const DL_DIR = USGS_CONFIG.download_directory

// The number of concurrent downloads in progress
var active_downloads = 0

module.exports = {
  main,
  make_initial_query,
  process_scenes_for_dataset,
  process_scene,
  start_download,
  handle_response,
  update_record,
  make_filename,
  CONCURRENT_DL_LIMIT,
  logger
}


// Run main function if script is run from commandline
if (require.main === module) main()


///////////////////////////////////////////////////////////////////////////////////

function main () {
  var query_text = make_initial_query(process.argv.slice(2))
  var dataset_names = usgs_constants.LANDSAT_DATASETS.slice()
  pg_handler.pool_query_db(pg_pool, query_text, [], function (query_result) {
    if (query_result.rows && query_result.rows.length) {
      var scenes_by_dataset = usgs_helpers.sort_scene_records_by_dataset(query_result.rows)
      usgs_helpers.process_scenes_by_dataset(
        dataset_names,
        scenes_by_dataset,
        process_scenes_for_dataset
      )
    }
    else {
      logger.log(
        logger.LEVEL_INFO,
        'INFO select query returned no rows to process.'
      )
    }
  })

}

/**
 * Builds the initial select query for scenes to download.
 *
 * The argument to this script should be a list of all
 * command-line arguments (scene ids). If there were none, the list is empty.
 * If the list is empty, make the query the last days scenes view.
 *
 */
function make_initial_query (scenes) {
  if (scenes.length) {
    if (scenes.length > CONCURRENT_DL_LIMIT) {
      throw new Error(
        'Cannot support more than '
        + parseInt(CONCURRENT_DL_LIMIT)
        + ' commandline arguments'
      )
    }
    var query = custom_request_query_template
    query += app_helpers.list_array_to_sql_list(
      scenes.slice(0, CONCURRENT_DL_LIMIT)
    )
    return query
  }
  else {
    return last_days_scenes_query_text
  }
}


/**
 * Process scenes belonging to the same landsat dataset.
 * Limit concurrent downloads so we don't overload the USGS server.
 *
 */
function process_scenes_for_dataset (dataset_name, scenes) {
  if (scenes && scenes.length && active_downloads < CONCURRENT_DL_LIMIT) {
    return api_key_promise.then(function (apiKey) {
      const scene_id = scenes.pop()
      return process_scene(dataset_name, scene_id, apiKey)
    }).catch(function (err) {
      logger.log(
        logger.LEVEL_ERROR,
        'ERROR retrieving api key',
        err.stack
      )
    }).then(function() {
      if (active_downloads < CONCURRENT_DL_LIMIT) {
        return process_scenes_for_dataset(dataset_name, scenes)
      }
      else {
        logger.log(
          logger.LEVEL_INFO,
          'ERROR Rate limit for attempted downloads reached',
          CONCURRENT_DL_LIMIT
        )
      }
    })
  }
}

/**
 * Get the download link for a scene and start the download.
 *
 */
function process_scene (dataset_name, scene_id, apiKey) {
  console.log('process_scene', apiKey, scene_id)
  const request_body = usgs_functions.usgsapi_download(
    apiKey,
    usgs_constants.NODE_EE,
    dataset_name,
    USGS_DL_PRODUCTS,
    [scene_id]
  )
  console.log('process_scene', request_body)
  return usgs_helpers.get_usgsapi_response(
    USGS_DL_RESPONSE_CODE,
    request_body
  ).catch(function (err) {
    logger.log(logger.LEVEL_ERROR, err.stack)
  }).then(function (response) {
    console.log('process_scene', response)

    if (response && response.length) {
      logger.log(
        logger.LEVEL_INFO,
        'START downloading ',
        scene_id + '.tar.gz'
      )
      return start_download(scene_id, response[0])
    }
  })

}


/**
 * Start a download for a scene's products.
 *
 * @param scene_id of the product we are downloading
 * @param url is the download link generated by the USGS API
 */
function start_download (scene_id, url) {
  const filename = make_filename(scene_id)
  const path = DL_DIR + filename
  if (fs.existsSync(path)) {
    logger.log(
      logger.LEVEL_INFO,
      'INFO ' + filename + ' already exists. Deleting old file.'
    )
    fs.unlinkSync(path)
  }
  const file = fs.createWriteStream(path)
  request
    .get(url)
    .on('error', function (err) {
      logger.log(logger.LEVEL_ERROR, err)
    })
    .on('response', function (response) {
      handle_response(response, scene_id)
    })
    .pipe(file)
    .on('finish', function () {
      active_downloads -= 1
      update_record(scene_id)
      logger.log(
        logger.LEVEL_INFO,
        'DONE downloading',
        filename
      )
    })
  return Promise.resolve(active_downloads += 1)
}



/**
 * Check the http response from a download url.
 *
 * @param response is an instance of http.incomingMessage
 * @param scene_id is the id of the scene being downloaded
 *
 */
function handle_response (response, scene_id) {
  if (response.statusCode > 200) {
    logger.log(
      logger.LEVEL_ERROR,
      'ERROR USGS responded with status code '
      + response.statusCode
      + ' while attempting to download archive for '
      + scene_id
    )
  }
}

/**
 * Update a scene record to reflect that
 * the scene's products were successfully downloaded.
 *
 */
function update_record (scene_id) {
  const query_text = ""
    + "UPDATE landsat_metadata "
    + "SET "
      + "needs_downloading = 'NO', "
      + "downloaded = 'YES', "
      + "needs_processing = 'YES' "
      + "WHERE scene_id = '" + scene_id + "'"
  pg_handler.pool_query_db(pg_pool, query_text, [], function () {
    logger.log(
      logger.LEVEL_INFO,
      'DONE updating database record for scene ' + scene_id
    )
  })
}

function make_filename (scene_id) {
  return scene_id + '.tar.gz'
}
