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
var ROWS;
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

var testdownload = function(body){


  //set base URL for axios
  axios.defaults.baseURL = USGS_CONSTANT.USGS_URL;


    const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('getorderproducts');

      //actual request after the last promise has been resolved
      return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, body)
        .then( download_response => {})
        .catch( (error) => {
          failed_downloads.push({scene_id});
          // console.log(failed_downloads)
          console.log('dowload  api: ' + error);
          DownloadScenes.add_failed(error, scene_id);

        });



}

//generic holder of downloads
var DownloadScenes = (function() {
  var DownloadScenes = [];
  var scenes_in_download = [];
  var doit = true;
  var add = true;

  var downloaded_scenes = 0;
  var total_scenes_for_download = 0;
  var OrderScenes = [];
  var scenes_in_order = [];
  var FailedScenes = [];

  var total_count = 0;
  var count = 0;
  var count_api = 0;

  var current_download = 0;
  var max_downloads = 5;

  var simultaneous = false;
  var start_order_complete = false;
  var start_download = false;

  function increment_count(count, val) {
    const current_count = count;
    return current_count += val;
  }

  //use generic error log for
  function write_error(msg, val){
    logger.log('error', msg + ': ' + val);
  }

  function do_action(action, body){
    console.log(action + ": " + JSON.stringify(body))
  }

  function order(){
    var lastPromise = Promise.resolve();

    OrderScenes.map( order => {

      return lastPromise = lastPromise.then( () => {

        // console.log("order: " + JSON.stringify(order))

        const request_body = order;
        const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('getorderproducts');

        //actual request after the last promise has been resolved
        return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
          .then( getorderproducts_response => {
            const orderobj = getorderproducts_response[0].availableProducts.filter( res => {
              return res.price === 0 && res.productCode.substring(0,1) != 'W' && res.outputMedias[0] === "DWNLD"

            })
            console.log(JSON.stringify(orderobj))
            if (orderobj){

              const apiKey = order.apiKey
              const node = order.node
              const datasetName = order.datasetName
              const orderingId = getorderproducts_response[0].orderingId
              const productCode = orderobj[0].productCode
              const option = 'None'
              const outputMedia = 'DWNLD'

              const request_body = {apiKey, node, datasetName, orderingId, productCode, option, outputMedia}
              console.log(request_body)
              const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('updateorderscene');
              return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
                  .then( order_response => {
                    console.log(order_response)
                  })
                  .catch( (error) => {
                    console.log('updateorderscene api: ' + error);
                  });


            }


          })
          .catch( (error) => {
            console.log('getorderproducts api: ' + error);
          });

      }).catch( (error) => {
        console.log('last promise orders: ' + error);
      })

    })
  }

  function transfer_array_value(to_list, from_list){
    var temp_to_list = to_list
    const last_item = from_list.pop();
    return temp_to_list.push(last_item)
  }


  function downloadasynctest(callback){
    setTimeout(function(){
      if(scenes_in_download.length > 0){
        const downlod_completed = scenes_in_download.pop()
        // console.log('downloading... scene')
        downloaded_scenes += 1;
        console.log('downloaded scenes: ' + downloaded_scenes)
      } else {
        console.log('waiting...')
      }
      callback();
    }, Math.floor(Math.random() * 5000) + 1 );
  };

  // function download(count){
  //
  //
  //
  //
  //
  //
  // }

  // registerListener(function(val) {
  //   // console.log("Someone changed the value to " + val);
  // });

  // function
  return {


      // if(this.iscomplete()){
      //   console.log('completed checking for download')
      //   if (total_scenes_for_download != downloaded_scenes){
      //     this.whilebackground()
      //   }
      // } else {
      //   this.whilebackground()
      // }
    // },
    Listener: function(val) {},
    registerListener: function(listener) {
      this.Listener = listener;
    },
    download: function(){
      if(add){
        add = false;
      }
    },
    add_download: function(val) {
      count = increment_count(count, 1);
      total_scenes_for_download = increment_count(total_scenes_for_download, 1);
      DownloadScenes.push(val);
      // this.Listener(val);
      this.download(count);

      // do_action('download', val);
      // if (count === 1){initiate_downloads();}
      return val;
    },
    add_order: function(val) {
      count = increment_count(count, 1);
      OrderScenes.push(val);
      if(count === total_count){
        doit = false;
      }
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

function asyncLoop(iterations, func, callback) {
    var index = 0;
    var done = false;
    var loop = {
        next: function() {
            if (done) {
                return;
            }

            if (index < iterations) {
                index++;
                func(loop);

            } else {
                done = true;
                callback();
            }
        },

        iteration: function() {
            return index - 1;
        },

        break: function() {
            done = true;
            callback();
        }
    };
    loop.next();
    return loop;
}

do_download = function(scene_downloads, counter){
  return new Promise((resolve, reject) => {
    resolve(1)
    DownloadCounter.increment();

    var startTime = Date.now();
    asyncLoop(100000, function(loop) {
        someFunction(1, 2, function(result) {

            // log the iteration
            console.log(loop.iteration());

            // Okay, for cycle could continue
            loop.next();
        })},
        function(){
          console.log('cycle ended')
        }
    );

    console.log(counter.value())
    counter.decrement();
    const test = scene_downloads.pop()
    console.log('send: ')
    console.log(test)



  })

};
//
// var asynct = function(DownloadCounter) {
//     var p = new Promise();
//     setTimeout(function() {
//         DownloadCounter.decrement()
//         const scene = scenes.pop();
//         console.log(scene)
//
//         p.resolve();
//     }, 2000);
//
//     return p.promise(); // Note we're not returning `p` directly
// }
//
// download_scene = function (scenes){
//
//   currentDownloads = DownloadCounter.value();
//   console.log(currentDownloads)
//   if(currentDownloads <= MAX_DOWNLOADS_AT_A_TIME){
//     asynct(DownloadCounter)
//   }
// }

Array.observe(scene_downloads, function(changes) {
  //console.log(changes);
});

//
// Array.observe(scene_downloads, (changes) => {
//     const currentDownloads = DownloadCounter.value();
//     console.log(currentDownloads)
//
//     if(currentDownloads <= MAX_DOWNLOADS_AT_A_TIME){
//       console.log("download:")
//       console.log(scene_downloads[scene_downloads.length-1])
//       const prom = do_download(scene_downloads,DownloadCounter);
//       prom
//         .then( d => {
//           console.log('then')
//         })
//       console.log("-------")
//
//     } else {
//       console.log('waiting')
//     }
//     // console.log(changes)
//     // console.log(scene_downloads)
//     // scene = scene_downloads.pop();
//     // console.log(scene)
//     // get_tar(tarFile, dest, MAX_DOWNLOADS_AT_A_TIME)
//    //   .then((data) => console.log('downloading: ' + data))
//    //   .catch((err) => console.error(err));
//     console.log('scene_downloads changed')
//
//
// });




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
const last_day_scenes = "SELECT * FROM landsat_metadata  WHERE acquisition_date =  '2003-08-25'::date LIMIT 9"

// "SELECT * FROM landsat_metadata WHERE acquisition_date > '2003-08-01'::date AND acquisition_date < '2003-08-31'::date ORDER BY acquisition_date DESC"

// WHERE acquisition_date =  '2003-08-01'::date"

// ""

// "SELECT * FROM landsat_metadata WHERE  acquisition_date > '2003-08-01'::date AND acquisition_date < '2006-08-01'::date ORDER BY acquisition_date DESC" //"SELECT * FROM vw_last_days_scenes"; // WHERE substr(scene_id,1,3) = 'LC8';

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
  switch (true) {
    case (proudctAbbrevation === "LC8"): //LANDSAT 8
      return  "LANDSAT_8";
      break;
    case (proudctAbbrevation === "LE7") && (slc_off): //LANDSAT 7 with slc off
      return "LANDSAT_ETM_SLC_OFF";
      break;
    case (proudctAbbrevation === "LE7") && (!slc_off): //LANDSAT 7 with slc on
      return "LANDSAT_ETM";
      break;
    case (proudctAbbrevation === "LT5"): //LANDSAT 5
      return "LANDSAT_TM";
      break;
    default:
      return "LANDSAT_8";
      break;
  }

};


var get_download = function(scene_id){
  //see if scene needs to be downloaded or ordered by finding out about availablelty
  const request_body = USGS_FUNCTION.usgsapi_download(apiKey, node, datasetName, products, entityIds);

  const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('download');

        //actual request after the last promise has been resolved
        return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
          .then( download_response => {

            console.log(download_response)

            const tarFile = standard_option[0].url //downloads[0];
            const dest = DOWNLOAD_DIR + scene_id + '.tar.gz';
            const download = {tarFile, dest};

            // if we do have a URL attempt download
            return get_tar(tarFile, dest, MAX_DOWNLOADS_AT_A_TIME)
              .then((data) => console.log('downloading: ' + data))
              .catch((err) => console.error(err));


          }).catch( (error) => {
            // console.error('last promise: ' + error);

            failed_downloads.push({scene_id});
            // console.log(failed_downloads)
            console.log('dowload  api: ' + error);
          });

}
// DownloadScenes.initiate();



// query to check for duplicate scenes
query.on('row', function(row, result) {
    // console.log(row);
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
        // console.log(request_body );

        const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('downloadoptions');

        //make call to USGS api.  Make sure last promise is resolved first
        //  becuase USGS api is throttled for one request at a time
        return lastPromise = lastPromise.then( () => {
          //yes USGS throttles downloads so lets wait a few seconds before next request;

            //actual request after the last promise has been resolved
            return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
              .then( downloads => {

                // console.log(ROWS)

                // nothing to return so write out failed????
                if(!downloads[0]){
                  console.log(scene_id)
                  console.log(downloads[0])
                  console.log(request_body)
                  DownloadScenes.add_failed('not able to download scene', scene_id);
                }

                //get the download option for the standard
                const standard_option_order = downloads[0].downloadOptions.filter( options => {
                  return options.downloadCode === "STANDARD" && !options.available
                })

                //get the download option for the standard
                const standard_option_dowload = downloads[0].downloadOptions.filter( options => {
                  return options.downloadCode === "STANDARD" && options.available
                })


                // console.log('order: ' + standard_option_order.length)
                // console.log('download: ' + standard_option_dowload.length)
                // console.log('entityId: ' + downloads[0].entityId)

                const entityId = downloads[0].entityId;
                const entityIds = [entityId]

                if(standard_option_order.length > 0){
                  console.log(standard_option_order)
                  const orders_obj = {apiKey,node,datasetName,entityIds};
                  orders.push(orders_obj);
                  DownloadScenes.add_order(orders_obj)
                }

                if(standard_option_dowload.length > 0){
                  const download_obj = {apiKey,node,datasetName,products,entityIds};
                  scene_downloads.push(download_obj);
                  DownloadScenes.add_download(download_obj)
                }

                if(orders_obj){
                  // console.log(download_obj)
                  console.log(scene_id)
                  console.log(orders_obj)
                  console.log('')
                }

                console.log('total: ' + DownloadScenes.get_total_count())
                console.log('Current: ' + DownloadScenes.get_current_count())
                console.log('complete: ' + DownloadScenes.iscomplete())

                if( DownloadScenes.iscomplete() ) {

                  DownloadScenes.start_order()
                  // DownloadScenes.start_download()
                }

                // console.log(JSON.stringify(standard_option_dowload[0].url))
                //
                // const url = standard_option_dowload[0].url
                // const dest = DOWNLOAD_DIR + scene_id + '.tar.gz';
                //
                // return get_tar(url, dest, MAX_DOWNLOADS_AT_A_TIME)
                //   .then((data) => console.log('downloading: ' + data))
                //   .catch((err) => console.error(err));

                // download_scene(scene_downloads);

                // console.log(orders)
                // console.log(scene_downloads)

                //  const products;
                //
                // //see if scene needs to be downloaded or ordered by finding out about availablelty
                // const request_body = USGS_FUNCTION.usgsapi_download(apiKey, node, datasetName, products, entityIds);
                //
                // const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('download');

                      // //actual request after the last promise has been resolved
                      // return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
                      //   .then( download_response => {
                      //
                      //     // console.log(download_response)
                      //
                      //     // const tarFile = standard_option[0].url //downloads[0];
                      //     // const dest = DOWNLOAD_DIR + scene_id + '.tar.gz';
                      //     // const download = {tarFile, dest};
                      //
                      //     // // if we do have a URL attempt download
                      //     // return get_tar(tarFile, dest, MAX_DOWNLOADS_AT_A_TIME)
                      //     //   .then((data) => console.log('downloading: ' + data))
                      //     //   .catch((err) => console.error(err));
                      //
                      //
                      //   }).catch( (error) => {
                      //     // console.error('last promise: ' + error);
                      //
                      //     failed_downloads.push({scene_id});
                      //     // console.log(failed_downloads)
                      //     console.log('dowload  api: ' + error);
                      //   });



                // //if the url is blank order the product
                // if(!tarFile){
                //   console.log('blank: ' + scene_id)
                //
                //   //get order response body
                //   // const response_body = USGS_HELPER.usgsapi_getorderproducts(apiKey, node, datasetName, entityIds)
                //   // const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('getorderproducts');
                //   //
                //   // return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
                //   //   .then( products_for_order => {
                //   //
                //   //     //loop all potential products to get available products
                //   //     products_for_order.map( potential_product => {
                //   //       //loop the product available products array to get whatis available for each
                //   //       // proudut.
                //   //       potential_product.availableProducts.map( prod => {
                //   //         const productCode = prod.productCode;
                //   //         const price = prod.productCode;
                //   //
                //   //         if (price === 0 && productCode.substring(0,1) != 'W' ){
                //   //           //order
                //   //           console.log(prod.outputMedias)
                //   //         }
                //   //
                //   //       })
                //   //     })
                //
                //     // })
                //     // .catch((err) => console.error(err));
                //     //then updateOrderScene
                //     //then orderItemBasket
                //     //then  orderItem
                //     //then submitOrder
                //     //wait for download to become available and download
                //
                // } else {



                // }

            }).catch( (error) => {
              // console.error('last promise: ' + error);

              failed_downloads.push({scene_id});

              // console.log(failed_downloads)
              console.log('dowload options api: ' + error);
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


  });

query.on('error', function(err) {
    console.log(err);
  });

query.on('end', function(result) {
    // console.log(result);
    //do nothing
    // console.log('end')
    // console.log(result.rowCount);
    // ROWS = result.rowCount;
    // console.log(result.rows.length)
    DownloadScenes.set_total(result.rowCount);
  });


      // // console.log(result);
      // //do nothing
      // console.log(orders)
      // console.log(scene_downloads)

//write progess to log date stamped

// manage logs

//send email failures

logger.log('info','update metadata end');
