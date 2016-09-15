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

//max amount concurent simultaneous downloads from the USGS api
//  it is 10 in ten minutes but we are limiting to a 5 at a time so we are not
//  overloading the server
const MAX_DOWNLOADS_AT_A_TIME = 5;

var failed_downloads = [];

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({ filename: 'download_landsat_data.log'})
  ]
});

const DOWNLOAD_DIR = './downloads/';

//generic counter for qeueing the # of concurent downloads
var DownloadCounter = (function() {
  var privateCounter = 1;
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


//function to get tar files from a passed url
//  this also turns the download in to promise and Also
//  limits the # simultaneous downloads to
const get_tar = function(url, dest, simultaneous_donwloads ) {

  const currentDownloads = DownloadCounter.value();

  // return new pending promise
  return new Promise((resolve, reject) => {

    //if url is blank that usually means it needs to ordered add order code
    if(!url){
      reject('url is blank, maybe you need to order the scene?');
    };

    //define the correct http protocal to make download request
    const lib = url.startsWith('https') ? require('https') : require('http');
    const request = lib.get(url, (response) => {
      // handle http errors
      //in busy state keep sending until 503 resolved
      /// not sure I want to do this yet
      // if (response.statusCode === 503){
      //   getContent(url, dest)
      // };

      if (response.statusCode < 200 || response.statusCode > 299) {
         reject(new Error('Failed to load page, status code: ' + response.statusCode));
       }

      // temporary data holder
      var file = fs.createWriteStream(dest);

      //on resolve when the #of files being downloaed is less than the
      //  MAX_DOWNLOADS_AT_A_TIME.  this ensures that only when a files has
      //  been completely downloaded will a new one begin and not reach the limit
      //  of 10 in to minutes not completed.  Also it seems that whnen more than
      //  five occur I see 503 errors so keeping MAX_DOWNLOADS_AT_A_TIME at 4 for now
      if(currentDownloads <= simultaneous_donwloads){
        resolve(dest)
        //keep incrementing the # of concurent downloads to will reach the max allowed
        //  (determined by the USGS api) and simultaneous_donwloads
        DownloadCounter.increment();
      }

      // on every content datachunk, push it to the file and write it.
      response.on('data', (datachunk) => file.write(datachunk));

      // we are done, resolve promise with and close the downliaded tar file
      response.on('end', () =>  {
        file.end()
        resolve(dest);

        //remove one from downoload counter so we can start a new download
        DownloadCounter.decrement();
      });

    });
    // handle connection errors of the request
    request.on('error', (err) => {
        reject(err)
      })
    })
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


var get_datasetName = function(scene_id, acquisition_date){

  const onoff_date = new Date("2003-05-31");
  const image_acquisition_date = new Date(acquisition_date);

  //check of slc of off in not assume on
  const slc_off = (onoff_date < image_acquisition_date);

  //get product abbrevation. This identifes the imager product
  proudctAbbrevation = scene_id.substring(0, 3);

  //get the product abbrevation so we can determine the USGS
  //  dataset name
  switch (proudctAbbrevation) {
    case "LC8": //LANDSAT 8
      return datasetName = "LANDSAT_8";
      break;
    case "LE7" && slc_off: //LANDSAT 7 with slc off
      return datasetName = "LANDSAT_ETM_SLC_OFF";
      break;
    case "LE7" && !slc_off: //LANDSAT 7 with slc on
      return datasetName = "LANDSAT_ETM";
      break;
    case "LT5": //LANDSAT 5
      return datasetName = "LANDSAT_TM";
      break;
    default:
      return datasetName = "LANDSAT_8";
      break;
  }

};

//query to check for duplicate scenes
// query.on('row', function(row) {
    // console.log(row);
    //process rows here

      api_key
      .then( (apiKey) => {

        //get constant for node "EE"
        const node = USGS_CONSTANT.NODE_EE;
        const entityIds = [];
        const products;
        const scene_id = "LE70220342016257EDC00" //row.scene_id;
        const acquisition_date = "2016-09-13"//row.acquisition_date;

        //derive dataset name from the scene_id and acquisition_date
        const datasetName = get_datasetName(scene_id, acquisition_date);
        console.log(datasetName)

        //add scene_id to entityIds array only one here,  api requires the scene_id(s) as an array
        entityIds.push(scene_id);

        //get the actaull filterid value from the request datasetfields
        const request_body = USGS_FUNCTION.usgsapi_download(apiKey, node, datasetName, products, entityIds);
        console.log(request_body)
        // console.log(request_body );

        const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('download');

        //make call to USGS api.  Make sure last promise is resolved first
        //  becuase USGS api is throttled for one request at a time
        return lastPromise = lastPromise.then( () => {
          //yes USGS throttles downloads so lets wait a few seconds before next request;

            //actual request after the last promise has been resolved
            return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
              .then( downloads => {
                console.log(downloads)
                //need to make order if the downloads is a blank string

                const tarFile = downloads[0];
                const dest = DOWNLOAD_DIR + scene_id + '.tar.gz';
                const download = {tarFile, dest};

                //if the url is blank order the product
                if(!tarFile){
                  console.log('blank: ' + scene_id)

                  //get order response body
                  const response_body = USGS_HELPER.usgsapi_getorderproducts(apiKey, node, datasetName, entityIds)
                  const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('getorderproducts');

                  return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
                    .then( products_for_order => {

                      //loop all potential products to get available products
                      products_for_order.map( potential_product => {
                        //loop the product available products array to get whatis available for each
                        // proudut.
                        potential_product.availableProducts.map( prod => {
                          const productCode = prod.productCode;
                          const price = prod.productCode;

                          if (price === 0 && productCode.substring(0,1) != 'W' ){
                            //order
                            console.log(prod.outputMedias)
                          }

                        })
                      })

                    })
                    .catch((err) => console.error(err));
                    //then updateOrderScene
                    //then orderItemBasket
                    //then  orderItem
                    //then submitOrder
                    //wait for download to become available and download

                } else {

                  // if we do have a URL attempt download
                  return get_tar(tarFile, dest, MAX_DOWNLOADS_AT_A_TIME)
                    .then((data) => console.log('downloading: ' + data))
                    .catch((err) => console.error(err));

                }

            }).catch( (error) => {
              // console.error('last promise: ' + error);

              failed_downloads.push({scene_id});
              console.log(failed_downloads)
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






    //if product is not avaiablable order it usgs api

    // wait for order to complete every n seconds via usgs apu

    // downoload order usgs api

    // write downloaded scenes to download.txt


//   });
//
// query.on('error', function(err) {
//     console.log(err);
//   });
//
// query.on('end', function(result) {
//     // console.log(result);
//     //do nothing
//   });



//write progess to log date stamped

// manage logs

//send email failures

logger.log('info','update metadata end');
