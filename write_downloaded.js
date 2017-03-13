/**
 * writes text file containing all the tar files that have downloaded
 * the LCV program uses this to create the latest change product.
 *
 */


 // Libraries
var axios = require('axios')
var url = require('url')
var yaml = require('yamljs')
var pg = require('pg')
var fs = require('fs')
var Promise = require('bluebird')
Promise.longStackTraces()

// Logging
const LOG_FILE = 'write_downloaded'
var logger = require('./lib/helpers/logger.js')(LOG_FILE)
// Set here so modules can see in require.main.exports
module.exports.logger = logger

//get modules
var usgs_constants = require("./lib/usgs_api/usgs_constants.js")
var usgs_functions = require("./lib/usgs_api/usgs_functions.js")
var usgs_helpers = require("./lib/usgs_api/usgs_helpers.js")
var pg_handler = require('./lib/postgres/postgres_handlers.js')
var app_helpers = require('./lib/helpers/app_helpers.js')()

// Database connection
const db_config = app_helpers.get_db_config()
var pg_pool = pg_handler.pg_pool(db_config)

//setup failure email
var emailer = require('./lib/email/send_error_email.js')
var error_email = emailer()

//get fields for sql query - that gets scences that need ordering,
const scenes_fields = ' scene_id, sensor, acquisition_date, browse_url, path, row, cc_full, cc_quad_ul, cc_quad_ur, cc_quad_ll, cc_quad_lr, data_type_l1 '

const query_text = "SELECT " + scenes_fields + " FROM landsat_metadata WHERE landsat_metadata.acquisition_date = ('now'::text::date - '14 days'::interval day) and needs_processing = 'YES' AND  downloaded = 'YES'"

//config data
const USGS_CONFIG = app_helpers.get_usgs_config()

//config constants
const DOWNLOAD_FILE_LCV_DIR = USGS_CONFIG.download_lcv_text
const download_directory = USGS_CONFIG.download_directory
const DOWNLOAD_DIR = download_directory


module.exports = {
  main,
  get_downloaded_scenes,
  write_downloaded_scenes,
  logger
}

if (require.main === module) main()

////////////////////////////////////////////////////////////////////////////////

/**
 * Main function. Pulls relevant records from the metadata table to be processed,
 * then initiates the processing logic for the query result.
 *
 */
function main () {
  pg_handler.pool_query_db(pg_pool, query_text, [], function(query_result) {
    if (query_result.rows && query_result.rows.length) {
      const downloaded_scenes = get_downloaded_scenes(query_result.rows)

      //write downloaded.txt file.  LCV uses this to process last days difference
      write_downloaded_scenes(downloaded_scenes)
    } else {
      logger.log(
        logger.LEVEL_INFO,
        'INFO select query returned no rows to process.'
      )
    }
  })

}

/**
 * Sort scene records by which dataset they belong to.
 *
 * @param records is a list of records (scenes) from the metadata table.
 * In other words, the 'rows' field of the result of a select query.
 *
 * @return an array: list of scene ids.
 *
 */
function get_downloaded_scenes (records) {
  if (records && records.length) {
    var _this = this
    var downloaded_scenes = []

    records.forEach(function(row) {
        downloaded_scenes.push(row.scene_id)
    })
    return downloaded_scenes
  }
}

/**
 * Sort scene records by which dataset they belong to.
 *
 * @param records is a list of records (scenes) from the metadata table.
 * In other words, the 'rows' field of the result of a select query.
 *
 * @return an array: list of scene ids.
 *
 */
function write_downloaded_scenes (records) {
  var downloaded_scenes = []

  const lcv_file = DOWNLOAD_FILE_LCV_DIR + 'downloaded.txt'

  records.forEach(function(row) {
    const dest = DOWNLOAD_DIR + row + '.tar.gz'

    //make sure the fie is actually on disk
    if (app_helpers.file_exists(dest)){
      msg_header = 'Writing ' + dest + ' to LCV file.'
      msg = dest
      logger.log(logger.LEVEL_INFO, msg_header, msg)
      downloaded_scenes.push(dest)

    //if file is not on disk do not write it to the LCV processing file.  this will cause
    //  LCV to fail
    } else {
      msg_header = 'The ' + dest + ' file does not exist on disk '
         + '-- skipping writing to LCV file.'
      msg = dest
      logger.log(logger.LEVEL_INFO, msg_header, msg)
    }
  })

  app_helpers.write_file(lcv_file, downloaded_scenes, true)

}
