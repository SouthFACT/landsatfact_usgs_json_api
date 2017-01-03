var axios = require('axios');
var url = require('url');
var yaml = require('yamljs');
var pg = require('pg');
var fs = require('fs');

//get modules
var USGS_CONSTANT = require("./lib/usgs_api/usgs_constants.js");
var USGS_FUNCTION = require("./lib/usgs_api/usgs_functions.js");
var USGS_HELPER = require("./lib/usgs_api/usgs_helpers.js");
var PG_HANDLER = require('./lib/postgres/postgres_handlers.js')
const update_lsf_database = require("./lib/postgres/update_lsf_database.js");

//config data
const CONFIG_YAML = yaml.load("./lib/usgs_api/config.yaml");

const DOWNLOAD_FILE_LCV_DIR = CONFIG_YAML.download_lcv_text;
const download_directory = CONFIG_YAML.download_directory;
const DOWNLOAD_DIR = download_directory;

//setup shared helpers
var apphelpers = require('./lib/helpers/app_helpers.js')
var APP_HELPERS = apphelpers();

//setup failure email
var emailer = require('./lib/email/send_error_email.js');
var error_email = emailer()

//call delete old files
APP_HELPERS.delete_old_files('write_downloaded', 'logs/', '.log');
APP_HELPERS.set_logfile('write_downloaded')

const LOG_LEVEL_DEBUG = 'debug';
const LOG_LEVEL_ERR = 'error';
const LOG_LEVEL_INFO = 'info';

var total_orders = 0

APP_HELPERS.set_logger_level('info');
APP_HELPERS.write_message(LOG_LEVEL_INFO, 'downloaded text file written', '');

//get config data
const PG_CONNECT = yaml.load("./lib/postgres/config.yaml");

//get pg_client so we can query the LSF database
const pg_client = PG_HANDLER.pg_connect(PG_CONNECT)

//get fields for sql query - that gets scences that need ordering,
const scenes_fields = ' scene_id, sensor, acquisition_date, browse_url, path, row, cc_full, cc_quad_ul, cc_quad_ur, cc_quad_ll, cc_quad_lr, data_type_l1 ';

const scenes_for_dowloading_SQL = "SELECT " + scenes_fields + " FROM landsat_metadata WHERE needs_processing = 'YES' AND  downloaded = 'YES'"

//Qiery the LSF database for scences that need to ordered
const query = pg_client.query(scenes_for_dowloading_SQL);

var count = 0;


var downloaded_scenes = []

// query to check for downloaded scenes.  dowloaded scenes will be written a text file for LCV processing
query.on('row', function(row, result) {

    var scene_id = row.scene_id;
    var acquisition_date = row.acquisition_date;

    //derieve dataset name from the scene_id and acquisition_date
    const datasetName = USGS_HELPER.get_datasetName(scene_id, acquisition_date);

    count = count + 1
    const dest = DOWNLOAD_DIR + scene_id + '.tar.gz';

    //make sure the fie is actually on disk
    if (APP_HELPERS.file_exists(dest)){
      msg_header = 'Writing ' + dest + ' to LCV file.';
      msg = dest;
      APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);
      downloaded_scenes.push(dest)

    //if file is not on disk do not write it to the LCV processing file.  this will cause
    //  LCV to fail
    } else {
      msg_header = 'The ' + dest + ' file does not exist on disk skipping writing to LCV file.';
      msg = dest;
      APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);
    }

    //get file destination
    const lcv_file = DOWNLOAD_FILE_LCV_DIR + 'downloaded.txt'

    //write out file when everything has been added to the downloaded_scenes array
    if(count >= total_orders){
      APP_HELPERS.write_file(lcv_file, downloaded_scenes, true)

      //if at end, and all orders procesed write out end of ordering
      APP_HELPERS.write_message(LOG_LEVEL_INFO, 'downloaded text file written end', '')
    }

})

query.on('error', function(err) {
  msg_header = 'query error';
  msg = err.message;
  APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg);
});

query.on('end', function(result) {
  msg_header = 'query completed';
  total_orders = result.rowCount
  const message = result.rowCount === 1 ? ' scene to write for LCV' : ' scenes to write for LCV'
  msg = result.rowCount + message;
  APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);
  if(result.rowCount === 0){
    APP_HELPERS.write_message(LOG_LEVEL_INFO, 'downloaded text file written end', '')
  }
});
