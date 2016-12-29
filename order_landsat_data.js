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

//setup shared helpers
var apphelpers = require('./lib/helpers/app_helpers.js')
var APP_HELPERS = apphelpers();

//setup failure email
var emailer = require('./lib/email/send_error_email.js');
var error_email = emailer()

//call delete old files
APP_HELPERS.delete_old_files('order_landsat_data', 'logs/', '.log');
APP_HELPERS.delete_old_files('order_failed', '', '.txt');
APP_HELPERS.delete_old_files('download_failed', '', '.txt');
APP_HELPERS.delete_old_files('downloaded', '', '.txt');
APP_HELPERS.delete_old_files('ordered', '', '.txt');
APP_HELPERS.set_logfile('order_landsat_data')

const LOG_LEVEL_ERR = 'error';
const LOG_LEVEL_INFO = 'info';

//config data
const CONFIG_YAML = yaml.load("./lib/usgs_api/config.yaml");

var scene_downloads = [];
var orders = [];

APP_HELPERS.set_logger_level('debug');

APP_HELPERS.write_message(LOG_LEVEL_INFO, 'ordering data start', '');


//set base URL for axios
axios.defaults.baseURL = USGS_CONSTANT.USGS_URL;

//get config data
const PG_CONNECT = yaml.load("./lib/postgres/config.yaml");

//get pg_client so we can query the LSF database
const pg_client = PG_HANDLER.pg_connect(PG_CONNECT)

//get fields for sql query - that gets scences that need ordering,
const scenes_fields = ' scene_id, sensor, acquisition_date, browse_url, path, row, cc_full, cc_quad_ul, cc_quad_ur, cc_quad_ll, cc_quad_lr, data_type_l1 ';

//set the SQL query to retreive scenes that need to be ordered
const scenes_for_dowloading_SQL = "SELECT " + scenes_fields + " FROM landsat_metadata WHERE needs_ordering = 'YES'"
//LT50190341989361XXX02,LT50190331989361XXX02,LT50150361989365XXX01
// WHERE sensor = 'LANDSAT_TM' LIMIT 250" // WHERE needs_ordering = 'YES'"

//captures lastpromise first one is resolved
var lastPromise = Promise.resolve();

//Qiery the LSF database for scences that need to ordered
const query = pg_client.query(scenes_for_dowloading_SQL);

//login and get promise for api key
var api_key_main = USGS_HELPER.get_api_key();

// query to check for duplicate scenes
query.on('row', function(row, result) {

  // process rows here
  api_key_main
  .then( (apiKey) => {

    //get constant for node "EE"
    var node = USGS_CONSTANT.NODE_EE;
    var entityIds = [];
    var products =  ["STANDARD"];
    var scene_id = row.scene_id;
    var acquisition_date = row.acquisition_date;

    //derieve dataset name from the scene_id and acquisition_date
    const datasetName = USGS_HELPER.get_datasetName(scene_id, acquisition_date);

    // make call to USGS api.  Make sure last promise is resolved first
    //  becuase USGS api is throttled for one request at a time
    //  wrap this in a resolve promoise so the there all requests are in promise and each one has
    //  to be resolved befire the next promise is started.  This is due to only limitations of the USGS API- only allows one
    //  api call at at time,
    return lastPromise = lastPromise.then( () => {

      var entityIds = [scene_id]

      var request_body = {apiKey, node, datasetName, entityIds};

      console.log('');
      console.log('getorderproducts');
      console.log(LOG_LEVEL_INFO, request_body)

      const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('getorderproducts');

      //actual request after the last promise has been resolved
      return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
      .then( getorderproducts_response => {

        // ensure there was a response
        if(getorderproducts_response[0] || getorderproducts_response){

          //filter possible products to downloadable level 1 datasets, with no cost.
          const orderobj = getorderproducts_response[0].availableProducts.filter( res => {
            return res.price === 0 && res.productCode.substring(0,1) != 'W' && res.outputMedias[0] === "DWNLD"

          })

          //only order the product if it is level 1 and downloadable.
          //  we need to get the product code and orderid
          if (orderobj.length > 0){

            //make request json for updating an order
            const orderingId = getorderproducts_response[0].orderingId
            const productCode = orderobj[0].productCode
            const option = 'None'
            const outputMedia = 'DWNLD'

            const request_body = USGS_FUNCTION.usgsapi_updateorderscene(apiKey, node, datasetName, productCode, outputMedia, option, orderingId);

            console.log('')
            console.log('updateorderscene')
            console.log(LOG_LEVEL_INFO, apiKey, node, datasetName, productCode, outputMedia, option, orderingId)

            //send request to USGS api to add the scene as an order
            const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('updateorderscene');

              return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
                  .then( order_response => {

                    //make request json for submitting the order
                    const ordered_scene = entityIds[0]
                    const request_body = USGS_FUNCTION.usgsapi_submitorder(apiKey, node)

                    //send request to USGS api to submit the order
                    //  unfourtunately there is no way to check the status (complete or in process) via the api
                    const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('submitorder');

                    console.log('')
                    console.log('submitorder');
                    console.log(LOG_LEVEL_INFO, apiKey, node)

                    return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
                      .then ( order => {

                        const msg_header = 'order submitted for';
                        const msg = ordered_scene;
                        console.log(LOG_LEVEL_INFO, msg_header, msg)

                   })
              })
          } else {
            console.log('nothing to order for scene ' + scene_id)
            console.log('');
          }

        }

      })
      .catch( (error) => {

        msg_header = 'get order products: ';
        msg = error.message;
        console.error(LOG_LEVEL_INFO,msg_header + msg)
      });

    })

  })

})

query.on('error', function(err) {
  msg_header = 'query error';
  msg = err.message;
  console.error(LOG_LEVEL_ERR, msg_header, msg);
});

query.on('end', function(result) {
  // DownloadScenes.set_total(result.rowCount);
  msg_header = 'query completed';
  const message = result.rowCount === 1 ? ' scene that need to ordered' : ' scenes that need to ordered'
  msg = result.rowCount + message;
  console.log(LOG_LEVEL_INFO, msg_header, msg);
});

  //  .catch( (error) => {
  //   msg_header = 'last promise error';
  //   msg = error.message;
  //   console.error(msg_header + ': ' + msg)
  //
  //   // APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);
  //
  // });
      // const list = {apiKey, scene_id, node, datasetName, acquisition_date}
// write_file('test-orders', list, false)

  // .catch( (error) => {
  //   msg_header = 'api';
  //   msg = error.message;
  //   console.error(msg_header + ': ' + msg)

    // APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);

    // });




      //   //add scene_id to entityIds array only one here,  api requires the scene_id(s) as an array
      //   entityIds.push(scene_id);
      //
      //   //see if scene needs to be downloaded or ordered by finding out about availablelty
      //   const request_body = USGS_FUNCTION.usgsapi_downloadoptions(apiKey, node, datasetName, entityIds);
      //
      //
      //   const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('downloadoptions');
      //
      //   //make call to USGS api.  Make sure last promise is resolved first
      //   //  becuase USGS api is throttled for one request at a time
      //   //  wrap this in a resolve promoise so the there all requests are in promise and each one has
      //   //  to be resolved befire the next promise is started.  This is due to only limitations of the USGS API- only allows one
      //   //  api call at at time,
      //   return lastPromise = lastPromise.then( () => {
      //     //yes USGS throttles downloads so lets wait a few seconds before next request;
      //
      //       //actual request after the last promise has been resolved
      //       return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
      //         .then( downloads => {
      //
      //           //console.log('checking ordering status of scene: ' + scene_id)
      //
      //           // nothing to return so write out failed????
      //           if(!downloads[0]){
      //             DownloadScenes.add_failed('not able to download scene', scene_id);
      //           }
      //
      //           //get the orders option for the standard
      //           const standard_option_order = downloads[0].downloadOptions.filter( options => {
      //             return options.downloadCode === "STANDARD" && !options.available
      //           })
      //
      //           const entityId = downloads[0].entityId;
      //           const entityIds = [entityId]
      //
      //           //create array to hold the request json for all orders
      //           if(standard_option_order.length > 0){
      //             const orders_obj = {apiKey,node,datasetName,entityIds};
      //
      //             msg_header = 'YOU NEED TO ORDER '
      //             msg =  JSON.stringify(orders_obj)
      //             APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);
      //
      //             orders.push(orders_obj);
      //
      //           }
      //
      //
      //
      //       }).catch( (error) => {
      //
      //         msg_header = 'could not determine for scene';
      //         msg = DownloadScenes.iscomplete();
      //
      //         DownloadScenes.add_failed(msg_header, scene_id);
      //         APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);
      //
      //
      //       });
      //
      //   }).catch( (error) => {
      //     msg_header = 'last promise error';
      //     msg = error.message;
      //     APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);
      //
      //   });
      //
      // }).catch( (error) => {
      //   msg_header = 'api';
      //   msg = error.message;
      //   APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);
      //
      //   });


  // });


  //
  // const entityId = downloads[0].entityId;
  // const entityIds = [entityId]
  //
  // //create array to hold the request json for all orders
  // if(standard_option_order.length > 0){
  //   const orders_obj = {apiKey,node,datasetName,entityIds};
  //
  //   msg_header = 'YOU NEED TO ORDER '
  //   msg =  JSON.stringify(orders_obj)
  //   APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);
  //
  //   orders.push(orders_obj);
  //
  // }



// })
// .catch( (error) => {
//
// msg_header = 'could not determine for scene: ' + scene_id;
// msg = error.message;
// console.error(msg_header + msg + ': ' + scene_id)
// msg = DownloadScenes.iscomplete();
//
// DownloadScenes.add_failed(msg_header, scene_id);
// APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);
// });


  //   console.log('')
  //   console.log('updateorderscene');
  //   console.log(apiKey, node, datasetName, productCode, outputMedia, option, orderingId)
  // //
  //   return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
  //       .then( order_response => {
  //
  //         //make request json for submitting the order
  //         const ordered_scene = entityIds[0]
  //         const request_body = USGS_FUNCTION.usgsapi_submitorder(apiKey, node)
  //
  //         //send request to USGS api to submit the order
  //         //  unfourtunately there is no way to check the status (complete or in process) via the api
  //         const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('submitorder');
  //
  //         console.log('')
  //         console.log('submitorder');
  //         console.log(apiKey, node)
  //
  //         // return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
  //         //   .then ( order => {
  //         //
  //         //     const msg_header = 'order submitted for';
  //         //     const msg = ordered_scene;
  //         //     APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg)
  //         //
  //         //
  //         //     //create the download request json of course the the order will need to be completed before it can be downloaded
  //         //     //  since their is no way via api to check and verify the status of the order we have to hope it is completed
  //         //     var products;
  //         //     const entityIds = [ordered_scene]
  //         //     const download_body = USGS_FUNCTION.usgsapi_download(apiKey, node, datasetName, products, entityIds)
  //         //
  //         //
  //         //
  //         //   })
  //           // //catch errors for the submitorder
  //           // .catch( (error) => {
  //           //   const msg_header = 'submitorder api';
  //           //   const msg = error.message;
  //           //   console.error(msg_header + msg + ': ' + scene_id)
  //           //
  //           // });
  //       })
  //       //catch errors for adding the order
  //       .catch( (error) => {
  //         const msg_header = 'updateorderscene api';
  //         const msg = error.message;
  //         // APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg)
  //         console.error(msg_header + msg + ': ' + scene_id)
  //
  //       });
  //
  //
