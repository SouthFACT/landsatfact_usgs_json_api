/**
 * Flags records in the metadata table to be 'ordered'
 * for download if they are not available for download from USGS.
 *
 */

// Libraries
var yaml = require('yamljs');
var pg = require('pg');
var fs = require('fs');
var winston = require('winston');
var axios = require('axios');

// Modules
var usgs_constants = require("./lib/usgs_api/usgs_constants.js");
var usgs_functions = require("./lib/usgs_api/usgs_functions.js");
var usgs_helper = require("./lib/usgs_api/usgs_helpers.js");
var pg_handler = require('./lib/postgres/postgres_handlers.js')
var app_helpers = require('./lib/helpers/app_helpers.js')()

// Database connection
const db_config = yaml.load("./lib/postgres/config.yaml");
const pg_client = pg_handler.pg_connect(db_config)

// PSQL Query
const query_text = "SELECT * FROM landsat_metadata WHERE needs_ordering != 'NO' OR needs_ordering IS NULL LIMIT 100"
const query = pg_client.query(query_text);

// Constants for USGS API Calls
const node = usgs_constants.NODE_EE;
const downloadCode = "STANDARD"
const dl_options_code = usgs_helper.get_usgs_response_code('downloadoptions');

axios.defaults.baseURL = usgs_constants.USGS_URL;

var get_api_key = usgs_helper.get_api_key();

//////////////////////////////////////

// Scenes to be flagged for ordering, grouped by dataset name
scenes = {
  LANDSAT_8: [],
  LANDSAT_ETM_SLC_OFF: [],
  LANDSAT_ETM: [],
  LANDSAT_TM: []
}

const process_query = function() {
  console.log('process query')
  query.on('row', function(row, result) {
    process_row(row)
  })
  query.on('end', function(result) {
    console.log('query end event')
    check_available()
  })
  query.on('error', function(err) {
    console.log(err)
  })
}

const process_row = function(row) {
  const dataset_name = usgs_helper.get_datasetName(row.scene_id, row.acquisition_date)
  scenes[dataset_name].push(row.scene_id)
}

const check_available = () => {
  console.log('check available')
  get_api_key.then(function (apiKey) {
    console.log('got api key')
    const request_body = usgs_functions.usgsapi_downloadoptions(apiKey, node, 'LANDSAT_ETM_SLC_OFF', scenes.LANDSAT_ETM_SLC_OFF);
    usgs_helper.get_usgsapi_response(dl_options_code, request_body).then(function(response) {
      console.log('process response')
      process_response(response)
    })
  })
  .catch(function (err) {
    console.log('Error\n', err)
  })

}

const process_response = (response) => {
  var available = response.filter
}


////////////////////////////////////////

const mark_for_ordering = function() {
  for (var i=0; i<scenes_to_order.length; i++) {
    console.log('order scene', scenes_to_order[i])
  }

  if (scenes_to_order.length === 0) {
    console.log('no scenes to order')
  }
}

process_query()




