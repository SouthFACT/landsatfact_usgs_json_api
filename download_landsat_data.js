var axios = require('axios');
var http = require('http');
var request = require('request');
var rp = require('request-promise');
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

const DOWNLOAD_DIR = './downloads/';
var Counter = (function() {
  var privateCounter = 0;
  function changeBy(val) {
    privateCounter += val;
  }
  return {
    increment: function() {
      changeBy(1);
    },
    decrement: function() {
      changeBy(-1);
    },
    value: function() {
      return privateCounter;
    }
  };
})();

const MAX_DOWNLOADS_AT_A_TIME = 4;


const getContent = function(url, dest) {

  const currentDownloads = Counter.value();

  // return new pending promise
  return new Promise((resolve, reject) => {
    // select http or https module, depending on reqested url
    if(!url){
      reject('url is blank, maybe you need to order the scene?');
    };
    const lib = url.startsWith('https') ? require('https') : require('http');
    const request = lib.get(url, (response) => {
      // handle http errors
      //in busy state keep sending until 503 resolved
      // if (response.statusCode === 503){
      //   getContent(url, dest)
      // };

      if (response.statusCode < 200 || response.statusCode > 299) {
         reject(new Error('Failed to load page, status code: ' + response.statusCode));
       }

      // temporary data holder
      var file = fs.createWriteStream(dest);
      console.log(currentDownloads);
      console.log(MAX_DOWNLOADS_AT_A_TIME);

      //on resolve when the #of files being downloaed is less than the
      //  MAX_DOWNLOADS_AT_A_TIME.  this ensures that only when a files has
      //  been completely downloaded will a new one begin and not reach the limit
      //  of 10 in to minutes not completed.  Also it seems that whnen more than
      //  five occur I see 503 errors so keeping MAX_DOWNLOADS_AT_A_TIME at 4 for now
      if(currentDownloads < MAX_DOWNLOADS_AT_A_TIME){
        resolve(dest)
        Counter.increment();
      }

      // on every content chunk, push it to the data array
      response.on('data', (chunk) => file.write(chunk));
      // we are done, resolve promise with those joined chunks
      response.on('end', () =>  {
        file.end()
        resolve(dest);
        Counter.decrement();
      });

    });
    // handle connection errors of the request
    request.on('error', (err) => {
        reject(err)
      })
    })
};


//
// function promisified_pipe(response, file) {
//   var ended = false;
//
//   return new Promise(function(resolve, reject) {
//     response.pipe(file);
//
//     function nice_ending() {
//       if (!ended) {
//         ended = true;
//         resolve();
//       }
//     }
//
//     function error_ending() {
//       if (!ended) {
//         ended = true;
//         reject("file error");
//       }
//     }
//
//     file.on('finish', nice_ending);
//     file.on('end', nice_ending);
//     file.on('error', error_ending);
//     file.on('close', error_ending);
//   }).finally(() => file.close())
// }
//
//  var testit = function(download) {
//    return new Promise(function(resolve, reject) {
//
//      request
//        .get(download.tarFile)
//        .on('response', function(response) {
//          console.log(download.tarFile + ' : ' + response.statusCode, response.headers['content-type']);
//          console.log(download);
//          // the call to `cb` could instead be made on the file stream's `finish` event
//          // if you want to wait until it all gets flushed to disk before consuming the
//          // next task in the queue
//
//          var file = fs.createWriteStream(download.dest);
//
//          response
//            .on('data', function(data) {
//              file.write(data);
//            })
//            .on('end', function() {
//              file.end();
//              console.log(download.dest + ' downloaded to ' + DOWNLOAD_DIR);
//              resolve(download.dest + ' downloaded to ' + DOWNLOAD_DIR);
//            })
//
//
//        })
//        .on('error', function(err) {
//          console.log(err);
//          reject(err);
//        })
//    }).then(resolve, reject)
//
//
// }

//
// var promisify = function(task, cb) {
//   request
//     .get(task.tarFile)
//     .on('response', function(response) {
//       console.log(task.tarFile + ' : ' + response.statusCode, response.headers['content-type']);
//       console.log(task);
//       // the call to `cb` could instead be made on the file stream's `finish` event
//       // if you want to wait until it all gets flushed to disk before consuming the
//       // next task in the queue
//
//       var file = fs.createWriteStream(task.dest);
//
//       response
//         .on('data', function(data) {
//           file.write(data);
//         })
//         .on('end', function() {
//           file.end();
//           resolve();
//           console.log(task.dest + ' downloaded to ' + DOWNLOAD_DIR);
//         })
//
//
//       cb();
//     })
//     .on('error', function(err) {
//       console.log(err);
//       reject(err)
//       cb(err);
//     })
// };

// q.drain = function() {
//   console.log('Done.')
// };

// var
// const MAX_DOWNLOADS_AT_A_TIME = 2;

// var q = async.queue(function(task, cb) {
//   request
//     .get(task.tarFile)
//     .on('response', function(response) {
//       console.log(task.tarFile + ' : ' + response.statusCode, response.headers['content-type']);
//       console.log(task);
//       // the call to `cb` could instead be made on the file stream's `finish` event
//       // if you want to wait until it all gets flushed to disk before consuming the
//       // next task in the queue
//
//       var file = fs.createWriteStream(task.dest);
//
//       response
//         .on('data', function(data) {
//           file.write(data);
//         })
//         .on('end', function() {
//           file.end();
//           console.log(task.dest + ' downloaded to ' + DOWNLOAD_DIR);
//         })
//
//
//       cb();
//     })
//     .on('error', function(err) {
//       console.log(err);
//       cb(err);
//     })
// }, MAX_DOWNLOADS_AT_A_TIME);
//
// q.drain = function() {
//   console.log('Done.')
// };

//
// var requestApi = function(url, next){
//   console.log(url)
//   request(url, function (error, response, body) {
//     console.log(body);
//     next(error);
//   });
// };

//
// // Function to download file using HTTP.get
// var download_file_httpget = function(scene_id, file_url) {
//   var options = {
//     host: url.parse(file_url).host,
//     port: 80,
//     path: url.parse(file_url).pathname
//   };
//
//   const file_name = scene_id + '.tar.gz';
//   const file = fs.createWriteStream(DOWNLOAD_DIR + file_name);
//
//   http.get(options, function(res) {
//     console.log(res);
//     res.on('data', function(data) {
//       file.write(data);
//     }).on('end', function() {
//       file.end();
//       console.log(file_name + ' downloaded to ' + DOWNLOAD_DIR);
//     });
//   });
// };

// function download_promise(response, file, dest) {
// let ended = false;
//
// return new Promise(function(resolve, reject) {
//     response.pipe(dest);
//
//     function nice_ending() {
//       if (!ended) {
//         ended = true;
//         resolve();
//       }
//     }
//
//     function error_ending() {
//       if (!ended) {
//         ended = true;
//         reject("file error");
//       }
//     }
//
//     file.on('finish', nice_ending);
//     file.on('end', nice_ending);
//     file.on('error', error_ending);
//     file.on('close', error_ending);
//   }).finally(() => file.close())
// }

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

                const tarFile = downloads[0];
                const dest = DOWNLOAD_DIR + scene_id + '.tar.gz';
                const download = {tarFile, dest};
                console.log(download.tarFile)

                return getContent(tarFile, dest)
                  .then((data) => console.log(data))
                  .catch((err) => console.error(err));

                // testit(download)
                //   .then( whatValue => {
                //     console.log(whatValue);
                //   });

                // return rp(download.tarFile)
                //   .then( whatValue => {
                //     console.log(whatValue)
                //   })
                //   .catch( (error) => {
                //     // console.error('last promise: ' + error);
                //     console.log('download tar: ' + error);
                //   });



                // //get tar file download
                // const tarFile = downloads[0];
                // const dest = DOWNLOAD_DIR + scene_id + '.tar.gz';
                // const download = {tarFile, dest};
                // testit(download)
                //   .then( whatValue => {
                //     console.log(whatValue);
                //   });


              // q.push(download, function(err) {
              //   if (err) {
              //     console.log(err);
              //   }
              // });

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
