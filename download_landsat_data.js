var axios = require('axios');
var yaml = require('yamljs');
var winston = require('winston');

//get modules
var USGS_CONSTANT = require("./lib/usgs_api/usgs_constants.js");
var USGS_FUNCTION = require("./lib/usgs_api/usgs_functions.js");
var USGS_HELPER = require("./lib/usgs_api/usgs_helpers.js");
const update_lsf_database = require("./lib/postgres/update_lsf_database.js");

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({ filename: 'download_landsat_data.log'})
  ]
});

logger.level = 'debug';

logger.log('info','update metadata start');

//set base URL for axios
axios.defaults.baseURL = USGS_CONSTANT.USGS_URL;

//config data must be in a file named metadata.yaml
const METADATA_YAML = yaml.load("./config/metadata.yaml");

//get the array of datasetnames for use in USGS API calls
const datasets = METADATA_YAML.metadata_datasets;


//query db and get the last days scenes

//got to usgs api and download the the product

//if product is not avaiablable order it usgs api

// wait for order to complete every n seconds via usgs apu

// downoload order usgs api

// write downloaded scenes to download.login

//write progess to log date stamped

// manage logs

//send email failures

logger.log('info','update metadata end');
