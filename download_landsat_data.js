var axios = require('axios');
var http = require('http');
var request = require('request');
var async = require('async');

var url = require('url');
var yaml = require('yamljs');
var pg = require('pg');
var fs = require('fs');
var winston = require('winston');

//get modules
var USGS_CONSTANT = require("./lib/usgs_api/usgs_constants.js");
var USGS_FUNCTION = require("./lib/usgs_api/usgs_functions.js");
var USGS_HELPER = require("./lib/usgs_api/usgs_helpers.js");
var PG_HANDLER = require('./lib/postgres/postgres_handlers.js')

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({ filename: 'download_landsat_data.log'})
  ]
});



function promiseDebounce(fn, delay, count) {
  var working = 0, queue = [];
  function work() {
    if ((queue.length === 0) || (working === count)) return;
    working++;
    Promise.delay(delay).tap(function () { working--; }).then(work);
    var next = queue.shift();
    next[2](fn.apply(next[0], next[1]));
  }
  return function debounced() {
    var args = arguments;
    return new Promise(function(resolve){
      queue.push([this, args, resolve]);
      if (working < count) work();
    }.bind(this));
  }

  
const DOWNLOAD_DIR = './downloads/';
const MAX_DOWNLOADS_AT_A_TIME = 1;

var q = async.queue(function(task, cb) {
  console.log(task.tarFile);
  if(task.tarFile){

    request
      .get(task.tarFile)
      .on('response', function(response) {
        // console.log(task.tarFile + ' : ' + response.statusCode, response.headers['content-type']);
        // console.log(task);
        // the call to `cb` could instead be made on the file stream's `finish` event
        // if you want to wait until it all gets flushed to disk before consuming the
        // next task in the queue

        var file = fs.createWriteStream(task.dest);

        response
          .on('data', function(data) {
            file.write(data);
          })
          .on('end', function() {
            file.end();
            console.log(task.dest + ' downloaded to ' + DOWNLOAD_DIR);
          })


        cb();
      })
      .on('error', function(err) {
        console.log(err);
        cb(err);
      })

  }

}, MAX_DOWNLOADS_AT_A_TIME);

q.drain = function() {
  console.log('Done.')
};


var requestApi = function(url, next){
  console.log(url)
  request(url, function (error, response, body) {
    console.log(body);
    next(error);
  });
};


// Function to download file using HTTP.get
var download_file_httpget = function(scene_id, file_url) {
  var options = {
    host: url.parse(file_url).host,
    port: 80,
    path: url.parse(file_url).pathname
  };

  const file_name = scene_id + '.tar.gz';
  const file = fs.createWriteStream(DOWNLOAD_DIR + file_name);

  http.get(options, function(res) {
    console.log(res);
    res.on('data', function(data) {
      file.write(data);
    }).on('end', function() {
      file.end();
      console.log(file_name + ' downloaded to ' + DOWNLOAD_DIR);
    });
  });
};

logger.level = 'debug';

logger.log('info','update metadata start');

//set base URL for axios
axios.defaults.baseURL = USGS_CONSTANT.USGS_URL;

//config data must be in a file named metadata.yaml
const METADATA_YAML = yaml.load("./config/metadata.yaml");

//get config data
const PG_CONNECT = yaml.load("./lib/postgres/config.yaml");

const pg_client = PG_HANDLER.pg_connect(PG_CONNECT)

//get the array of datasetnames for use in USGS API calls
const datasets = METADATA_YAML.metadata_datasets;


//query db and get the last days scenes
const last_day_scenes = "SELECT * FROM vw_last_days_scenes;";

//captures lastpromise first one is resolved
var lastPromise = Promise.resolve();


//login and get promise for api key
var api_key = USGS_HELPER.get_api_key();


const query = pg_client.query(last_day_scenes);


//query to check for duplicate scenes
query.on('row', function(row) {
    // console.log(row);
    //process rows here



      api_key
      .then( (apiKey) => {

        //get constant for node "EE"
        const node = USGS_CONSTANT.NODE_EE;
        const entityIds = [];
        const products;


        const scene_id = row.scene_id;
        const acquisition_date = row.acquisition_date;
        // const landsat_7_cut_date = new Date("2003-05-31");
        const datasetName = "LANDSAT_8";

        //get product abbrevation. This identifes the imager product
        proudctAbbrevation = scene_id.substring(0, 3);
        // isLandsat8 = (proudctAbbrevation === "LC8");
        // isLandsat7 = (proudctAbbrevation === "LE7");
        // isLandsat5 = (proudctAbbrevation === "LT5");

        // console.log(proudctAbbrevation);
        entityIds.push(scene_id);


        //get the actaull filterid value from the request datasetfields
        const request_body = USGS_FUNCTION.usgsapi_download(apiKey, node, datasetName, products, entityIds);
        // console.log(request_body );

        const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('download');

        //make call to USGS api.  Make sure last promise is resolved first
        //  becuase USGS api is throttled for one request at a time
        return lastPromise = lastPromise.then( () => {
          //yes USGS throttles downloads so lets wait a few seconds before next request;


            //actual request after the last promise has been resolved
            return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
            .then( downloads => {


              //get tar file download
              const tarFile = downloads[0];
              const dest = DOWNLOAD_DIR + scene_id + '.tar.gz';

              const download = {tarFile, dest};

              q.concurrency = 1;
              q.push(download, function(err) {
                if (err) {
                  console.log(err);
                }
              });

              // async.forEachLimit(tarFile, 2, requestApi, function(err){
              //   // err contains the first error or null
              //   if (err) throw err;
              //   console.log('All requests processed!');
              // });

              // var request = require('request');
              // request(tarFile, function (error, response, body) {
              //   console.log(body);
              //
              //   if (!error && response.statusCode == 200) {
              //     console.log('here')
              //     console.log(body) // Show the HTML for the Google homepage.
              //   }
              // })

              // download_file_httpget(scene_id, tarFile);

            }).catch( (error) => {
              // console.error('last promise: ' + error);
              console.log('dowload api: ' + error);

            });





        }).catch( (error) => {
          // console.error('last promise: ' + error);
          console.log('last promise error: ' + error);

        });

      }).catch( (error) => {
        // console.error('last promise: ' + error);
        console.log('api: ' + error);
        });






    //got to usgs api and download the the product

    //if product is not avaiablable order it usgs api

    // wait for order to complete every n seconds via usgs apu

    // downoload order usgs api

    // write downloaded scenes to download.txt


  });

query.on('error', function(err) {
    console.log(err);
  });

query.on('end', function(result) {
    // console.log(result);
    //do nothing
  });



//write progess to log date stamped

// manage logs

//send email failures

logger.log('info','update metadata end');
