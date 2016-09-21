var axios = require('axios');
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

//setup logger
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({ filename: 'logs/download_landsat_data.log'})
  ]
});

//max amount concurent simultaneous downloads from the USGS api
//  it is 10 in ten minutes but we are limiting to a 5 at a time so we are not
//  overloading the server
const MAX_DOWNLOADS_AT_A_TIME = 5;
var failed_downloads = []; //need to check a better way to do this


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

//generic holder of downloads
var DownloadScenes = (function() {
  var DownloadScenes = [];
  var scenes_in_download = [];

  var total_scenes_for_download = 0;
  var OrderScenes = [];
  var scenes_in_order = [];
  var FailedScenes = [];

  var total_count = 0;
  var count = 0;

  function increment_count(count, val) {
    const current_count = count;
    return current_count += val;
  }

  //use generic error log for
  function write_error(msg, val){
    logger.log('error', msg + ': ' + val);
  }

  function order(){
    var lastPromise = Promise.resolve();
    const totalorders = OrderScenes.length
    var ordercount = 0;

    //no orders then just go directly to download
    if(OrderScenes.length === 0){
      download();
    }

    OrderScenes.map( order => {

      return lastPromise = lastPromise.then( () => {
        ordercount += 1;

        //get the request JSON from the ordercenes array
        const request_body = order;
        const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('getorderproducts');

        //actual request after the last promise has been resolved
        return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
          .then( getorderproducts_response => {
            const orderobj = getorderproducts_response[0].availableProducts.filter( res => {
              return res.price === 0 && res.productCode.substring(0,1) != 'W' && res.outputMedias[0] === "DWNLD"

            })
            if (orderobj){

              //make request json for updating an order
              const apiKey = order.apiKey
              const node = order.node
              const datasetName = order.datasetName
              const orderingId = getorderproducts_response[0].orderingId
              const productCode = orderobj[0].productCode
              const option = 'None'
              const outputMedia = 'DWNLD'

              const request_body = USGS_FUNCTION.usgsapi_updateorderscene(apiKey, node, datasetName, productCode, outputMedia, option, orderingId);

              //send request to USGS api to add the scene as an order
              const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('updateorderscene');
              return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
                  .then( order_response => {

                    //make request json for submitting the order
                    const ordered_scene = order.entityIds[0]
                    const request_body = USGS_FUNCTION.usgsapi_submitorder(apiKey, node)

                    //send request to USGS api to submit the order
                    //  unfourtunately there is no way to check the status (complete or in process) via the api
                    const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('submitorder');
                    return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
                      .then ( order => {
                        console.log('order submitted for: ' + ordered_scene)
                        logger.log('info', 'order submitted for: ' + ordered_scene);

                        //create the download request json of course the the order will need to be completed before it can be downloaded
                        //  since their is no way via api to check and verify the status of the order we have to hope it is completed
                        const products;
                        const entityIds = [ordered_scene]
                        const download_body = USGS_FUNCTION.usgsapi_download(apiKey, node, datasetName, products, entityIds)

                        //  we can add the order request here to the end of the array of downloads that are available.
                        //  if when we get to this it is not available we will deal with the failure in the download section
                        DownloadScenes.push(download_body);
                        total_scenes_for_download = increment_count(total_scenes_for_download, 1);
                        //download
                        //wait just in case still sending requests for order.
                        //  only start download when finished to avoid simultaneous api calls :(
                        //  also since we cannot have simultaneous api calls we have to delay the download call to ensure
                        //  the orders have been submitted and there are no more calls to the api (by waiting to till have made the last order)
                        if(totalorders === ordercount){
                          setTimeout( download() , 5000 )
                        }

                      })
                      //catch errors for the submitorder
                      .catch( (error) => {
                        console.log('submitorder api: ' + error.message);
                        logger.log('error', 'submitorder api: ' + error.message);
                      });
                  })
                  //catch errors for adding the order
                  .catch( (error) => {
                    console.log('updateorderscene api: ' + error.message);
                    logger.log('error', 'updateorderscene api: ' + error.message);

                  });


            } else {
              //when all promises resloved attempt to start the download process just as final catch all
              //wait just in case still sending requests for order.
               setTimeout( download() , 5000 )
            }

          })
          //catch errors with getorderproducts request
          .catch( (error) => {
            //not handling this yet but I was running into problems with simultaneous calls when trying to download
            //  i believe waiting to all orders are complete has fixed this but I am placing this here in case
            //  we need to handle retrying this...
            if(error.message.indexOf('Rate limit exceeded - cannot support simultaneous requests') > 0){
              console.log('retry?')
            } else {
              console.log('getorderproducts api: ' + error.message);
              logger.log('error', 'getorderproducts api: ' + error.message);

            }
          });


      //catch all for all other errors with promises
      }).catch( (error) => {
        console.log('last promise orders: ' + error.message);
        logger.log('error', 'last promise orders: ' + error.message);

      })

    })
  }

  function download(){

    var lastPromise = Promise.resolve();

    DownloadScenes.map( order => {
      return lastPromise = lastPromise.then( () => {

        const request_body = order;

        const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('download');

        //actual request after the last promise has been resolved
        return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
          .then( download_response => {

            const scene_id = request_body.entityIds[0]
            const tarFile = download_response[0];
            const dest = DOWNLOAD_DIR + scene_id + '.tar.gz';
            const download = {tarFile, dest};

            // if we do have a URL attempt download
            return get_tar(tarFile, dest, scene_id, MAX_DOWNLOADS_AT_A_TIME)
              .then((data) => {
                //do nothing
              })
              .catch((err) => console.error(err));

        })
        .catch( (error) => {
          if(JSON.stringify(error).indexOf('Rate limit exceeded - cannot support simultaneous requests') > 0){
            console.log('retry?')
          } else {
            console.log('dowload api: ' + error.message);
            logger.log('error', 'dowload api: ' + error.message);

          }
        })
      })
      .catch( (error) => {
        console.log('last promise orders: ' + error.message);
        logger.log('error', 'last promise orders: ' + error.message);

      })
    })




  }

  //function to get tar files from a passed url
  //  this also turns the download in to promise and Also
  //  limits the # simultaneous downloads to
  const get_tar = function(url, dest, scene_id, simultaneous_donwloads ) {
    //add failed download.txt
    //add succeded download.txt

    const currentDownloads = DownloadCounter.value();

    // return new pending promise
    return new Promise((resolve, reject) => {

      //if url is blank that usually means it needs to ordered add order code
      if(!url){
        const msg = 'url is blank, maybe you need to order the scene or the scene has been ordered and is not ready?'
        logger.log('error', msg + ': ' + scene_id);
        FailedScenes.push(scene_id)

        //add scene to faileddownload txt
        reject('url is blank, maybe you need to order the scene or the scene has been ordered and is not ready?');
      };

      //define the correct http protocal to make download request
      const lib = url.startsWith('https') ? require('https') : require('http');
      const request = lib.get(url, (response) => {

        // handle http errors
        if (response.statusCode < 200 || response.statusCode > 299) {
            reject(new Error('Failed to load page, status code: ' + response.statusCode));
         }

        // temporary data holder
        var file = fs.createWriteStream(dest);

        console.log('downloading: ' + dest)
        logger.log('info', 'downloading: ' + dest);

        //on resolve when the #of files being downloaed is less than the
        //  MAX_DOWNLOADS_AT_A_TIME.  this ensures that only when a files has
        //  been completely downloaded will a new one begin and not reach the limit
        //  of 10 in to minutes not completed.  Also it seems that whnen more than
        //  five occur I see 503 errors so keeping MAX_DOWNLOADS_AT_A_TIME at 4 for now
        if(currentDownloads < simultaneous_donwloads){
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
          //add scene to download txt
          //remove one from downoload counter so we can start a new download
          DownloadCounter.decrement();
        });

      });

      // handle connection errors of the request
      request.on('error', (err) => {
        //add scene to faileddownload txt
          reject(err)
        })
      })
  };


  // function
  return {
    Listener: function(val) {},
    registerListener: function(listener) {
      this.Listener = listener;
    },
    download: function(){

    },
    add_download: function(val) {
      count = increment_count(count, 1);
      total_scenes_for_download = increment_count(total_scenes_for_download, 1);
      DownloadScenes.push(val);

      this.download(count);

      return val;
    },
    add_order: function(val) {
      count = increment_count(count, 1);
      OrderScenes.push(val);

      return val;
    },
    add_failed: function(msg,val) {
      count = increment_count(count, 1);
      FailedScenes.push(val);
      write_error(msg, val)
      return val;
    },
    get_current_count: function(){
      return count;
    },
    get_total_count: function(){
      return total_count;
    },
    set_total: function(val){
      total_count = val;
      return val
    },
    value: function() {
      return DownloadScenes;
    },
    iscomplete: function(){
      return count === total_count;
    },
    start_order: function(){
      order();
    },
    start_download: function(){
      download();
    },
  };


})();

var scene_downloads = [];
var orders = [];

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
const last_day_scenes = "SELECT * FROM landsat_metadata  WHERE acquisition_date =  '2003-08-25'::date LIMIT 9"

//acquisition_date =  '2016-08-25'::date LIMIT 7"

// acquisition_date =  '2003-08-25'::date LIMIT 9"

// "SELECT * FROM landsat_metadata WHERE acquisition_date > '2003-08-01'::date AND acquisition_date < '2003-08-31'::date ORDER BY acquisition_date DESC"

// WHERE acquisition_date =  '2003-08-01'::date"

// ""

// "SELECT * FROM landsat_metadata WHERE  acquisition_date > '2003-08-01'::date AND acquisition_date < '2006-08-01'::date ORDER BY acquisition_date DESC" //"SELECT * FROM vw_last_days_scenes"; // WHERE substr(scene_id,1,3) = 'LC8';

//captures lastpromise first one is resolved
var lastPromise = Promise.resolve();

//login and get promise for api key
var api_key = USGS_HELPER.get_api_key();

const query = pg_client.query(last_day_scenes);





// query to check for duplicate scenes
query.on('row', function(row, result) {

    // process rows here
      api_key
      .then( (apiKey) => {

        //get constant for node "EE"
        const node = USGS_CONSTANT.NODE_EE;
        const entityIds = [];
        const products =  ["STANDARD"];
        const scene_id = row.scene_id;
        const acquisition_date = row.acquisition_date;

        //derive dataset name from the scene_id and acquisition_date
        const datasetName = get_datasetName(scene_id, acquisition_date);

        //add scene_id to entityIds array only one here,  api requires the scene_id(s) as an array
        entityIds.push(scene_id);

        //see if scene needs to be downloaded or ordered by finding out about availablelty
        const request_body = USGS_FUNCTION.usgsapi_downloadoptions(apiKey, node, datasetName, entityIds);


        const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('downloadoptions');

        //make call to USGS api.  Make sure last promise is resolved first
        //  becuase USGS api is throttled for one request at a time
        return lastPromise = lastPromise.then( () => {
          //yes USGS throttles downloads so lets wait a few seconds before next request;

            //actual request after the last promise has been resolved
            return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
              .then( downloads => {

                // nothing to return so write out failed????
                if(!downloads[0]){
                  DownloadScenes.add_failed('not able to download scene', scene_id);
                  logger.log('error', 'not able to download scene: ' + scene_id);

                }

                //get the download option for the standard
                const standard_option_order = downloads[0].downloadOptions.filter( options => {
                  return options.downloadCode === "STANDARD" && !options.available
                })

                //get the download option for the standard
                const standard_option_dowload = downloads[0].downloadOptions.filter( options => {
                  return options.downloadCode === "STANDARD" && options.available
                })

                const entityId = downloads[0].entityId;
                const entityIds = [entityId]

                if(standard_option_order.length > 0){
                  const orders_obj = {apiKey,node,datasetName,entityIds};
                  orders.push(orders_obj);
                  DownloadScenes.add_order(orders_obj)
                }

                if(standard_option_dowload.length > 0){
                  const download_obj = {apiKey,node,datasetName,products,entityIds};
                  scene_downloads.push(download_obj);
                  DownloadScenes.add_download(download_obj)
                }

                console.log('total: ' + DownloadScenes.get_total_count())
                logger.log('info', 'total: ' + DownloadScenes.get_total_count());

                console.log('Current: ' + DownloadScenes.get_current_count())
                logger.log('info', 'Current: ' + DownloadScenes.get_current_count());

                console.log('complete: ' + DownloadScenes.iscomplete())
                logger.log('info', 'Current: ' + DownloadScenes.iscomplete());

                if( DownloadScenes.iscomplete() ) {
                  DownloadScenes.start_order()
                }


            }).catch( (error) => {

              failed_downloads.push({scene_id});
              console.log('dowload options api: ' + error.message);
              logger.log('error', 'download failed for scene: ' + scene_id);
              logger.log('error', 'dowload api: ' + error.message);

            });

        }).catch( (error) => {
          console.log('last promise error: ' + error.message);
          logger.log('error', 'last promise error: ' + error.message);

        });

      }).catch( (error) => {
         console.log('api: ' + error.message);
         logger.log('error', 'api: ' + error.message);
        });






    //if product is not avaiablable order it usgs api

    // wait for order to complete every n seconds via usgs apu

    // downoload order usgs api

    // write downloaded scenes to download.txt


  });

query.on('error', function(err) {
    console.log(err);
    logger.log('error', 'query error: ' + err.message);

  });

query.on('end', function(result) {
    DownloadScenes.set_total(result.rowCount);
  });



// manage logs

//send email failures

logger.log('info','update metadata end');
