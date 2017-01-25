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

//get modules
var usgs_constants = require("./lib/usgs_api/usgs_constants.js")
var usgs_functions = require("./lib/usgs_api/usgs_functions.js")
var usgs_helpers = require("./lib/usgs_api/usgs_helpers.js")
var pg_handler = require('./lib/postgres/postgres_handlers.js')
var app_helpers = require('./lib/helpers/app_helpers.js')()

// Database connection
const db_config = yaml.load("./lib/postgres/config.yaml")
var pg_pool = pg_handler.pg_pool(db_config)

//setup failure email
var emailer = require('./lib/email/send_error_email.js')
var error_email = emailer()


//Logging
const LOG_LEVEL_ERR = 'error'
const LOG_LEVEL_INFO = 'info'
const LOG_FILE = 'write_downloaded'
app_helpers.delete_old_files(LOG_FILE, 'logs/', '.log')
app_helpers.set_logger_level('debug')
app_helpers.set_logfile(LOG_FILE)
app_helpers.write_message(LOG_LEVEL_INFO, 'START '+LOG_FILE, '')

//get fields for sql query - that gets scences that need ordering,
const scenes_fields = ' scene_id, sensor, acquisition_date, browse_url, path, row, cc_full, cc_quad_ul, cc_quad_ur, cc_quad_ll, cc_quad_lr, data_type_l1 '

const query_text = "SELECT " + scenes_fields + " FROM landsat_metadata WHERE landsat_metadata.acquisition_date > ('now'::text::date - '3 days'::interval day) and needs_processing = 'YES' AND  downloaded = 'YES'"

module.exports = {
  main,
  get_downloaded_scenes,
  write_downloaded_scenes,
}

////////////////////////////////////////////////////////////////////////////////

main()


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
      app_helpers.write_message(
        LOG_LEVEL_INFO,
        'SELECT query returned no rows to process.'
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
  else {
    this.throw_error('No records supplied to sort by dataset')
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
  //config data
  const CONFIG_YAML = yaml.load("./lib/usgs_api/config.yaml")

  //config constants
  const DOWNLOAD_FILE_LCV_DIR = CONFIG_YAML.download_lcv_text
  const download_directory = CONFIG_YAML.download_directory
  const DOWNLOAD_DIR = download_directory

  var downloaded_scenes = []

  const lcv_file = DOWNLOAD_FILE_LCV_DIR + 'downloaded.txt'

  records.forEach(function(row) {
    const dest = DOWNLOAD_DIR + row + '.tar.gz'

    //make sure the fie is actually on disk
    if (app_helpers.file_exists(dest)){
      msg_header = 'Writing ' + dest + ' to LCV file.'
      msg = dest
      app_helpers.write_message(LOG_LEVEL_INFO, msg_header, msg)
      downloaded_scenes.push(dest)

    //if file is not on disk do not write it to the LCV processing file.  this will cause
    //  LCV to fail
    } else {
      msg_header = 'The ' + dest + ' file does not exist on disk skipping writing to LCV file.'
      msg = dest
      app_helpers.write_message(LOG_LEVEL_INFO, msg_header, msg)
    }
  })

  app_helpers.write_file(lcv_file, downloaded_scenes, true)

}

