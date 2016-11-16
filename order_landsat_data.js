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

var apphelpers = require('./lib/helpers/app_helpers.js')
var APP_HELPERS = apphelpers();

var emailer = require('./lib/email/send_error_email.js');
var error_email = emailer()

var download_counter = require('./download_counter.js');
var DownloadCounter = download_counter();

var download_scenes = require('./lib/helpers/DownloadScenes.js');
var DownloadScenes = download_scenes();

//call delete old files
APP_HELPERS.delete_old_files('order_landsat_data');
APP_HELPERS.delete_old_files('order_failed');
APP_HELPERS.delete_old_files('download_failed');
APP_HELPERS.delete_old_files('downloaded');
APP_HELPERS.delete_old_files('ordered');


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

const pg_client = PG_HANDLER.pg_connect(PG_CONNECT)

const scene_arg = process.argv[2]

const last_day_scenes_fields = ' scene_id, sensor, acquisition_date, browse_url, path, row, cc_full, cc_quad_ul, cc_quad_ur, cc_quad_ll, cc_quad_lr, data_type_l1 ';

const last_day_scenes = "SELECT " + last_day_scenes_fields + " FROM landsat_metadata"

var scenes_for_dowloading_SQL = last_day_scenes;

//check if there is an argument of a scene if so use that.
if( scene_arg ){
  scenes_for_dowloading_SQL = "SELECT " + last_day_scenes_fields + " FROM vw_last_days_scenes"
  //"SELECT " + last_day_scenes_fields + " FROM landsat_metadata  WHERE scene_id = '" + scene_arg + "'";
}

// //captures lastpromise first one is resolved
var lastPromise = Promise.resolve();

const query = pg_client.query(scenes_for_dowloading_SQL);

//login and get promise for api key
var api_key_main = USGS_HELPER.get_api_key();


//write the file for failed and dowloaded,ordered scenes
function write_file(file, list){


  const dest =  file + '.txt'

  fs.appendFileSync(dest, JSON.stringify(list )+ "\n");


}


// query to check for duplicate scenes
query.on('row', function(row, result) {


    // process rows here
      api_key_main
      .then( (apiKey) => {

        //get constant for node "EE"
        const node = USGS_CONSTANT.NODE_EE;
        const entityIds = [];
        const products =  ["STANDARD"];
        const scene_id = row.scene_id;
        const acquisition_date = row.acquisition_date;

        //derieve dataset name from the scene_id and acquisition_date
        const datasetName = USGS_HELPER.get_datasetName(scene_id, acquisition_date);

        //add scene_id to entityIds array only one here,  api requires the scene_id(s) as an array
        entityIds.push(scene_id);

        //see if scene needs to be downloaded or ordered by finding out about availablelty
        const request_body = USGS_FUNCTION.usgsapi_downloadoptions(apiKey, node, datasetName, entityIds);


        const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('downloadoptions');

        //make call to USGS api.  Make sure last promise is resolved first
        //  becuase USGS api is throttled for one request at a time
        //  wrap this in a resolve promoise so the there all requests are in promise and each one has
        //  to be resolved befire the next promise is started.  This is due to only limitations of the USGS API- only allows one
        //  api call at at time,
        return lastPromise = lastPromise.then( () => {
          //yes USGS throttles downloads so lets wait a few seconds before next request;

              //actual request after the last promise has been resolved
              return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
                .then( downloads => {


                  // nothing to return so write out failed????
                  if(!downloads[0]){
                    DownloadScenes.add_failed('not able to download scene', scene_id);
                  }

                  // //get the orders option for the standard
                  const standard_option_order = downloads[0].downloadOptions.filter( options => {
                    return options.downloadCode === "STANDARD" && !options.available
                  })


                  // {apiKey, scene_id, node, datasetName, acquisition_date}
                  if(standard_option_order.length > 0){

                    const entityIds = [scene_id]

                    const request_body = {apiKey, node, datasetName, entityIds};

                    // write_file('test-orders', request_body, false)

                    const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('getorderproducts');

                    //actual request after the last promise has been resolved
                    return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
                      .then( getorderproducts_response => {

                        //filter possible products to downloadable level 1 datasets, with no cost.
                        const orderobj = getorderproducts_response[0].availableProducts.filter( res => {
                          return res.price === 0 && res.productCode.substring(0,1) != 'W' && res.outputMedias[0] === "DWNLD"

                        })

                        //only order the product if it is level 1 and downloadable.
                        //  we need to get the product code and orderid
                        if (orderobj){

                          //make request json for updating an order
                          const apiKey = apiKey
                          const node = node
                          const datasetName = datasetName
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
                                const ordered_scene = entityIds[0]
                                const request_body = USGS_FUNCTION.usgsapi_submitorder(apiKey, node)

                                //send request to USGS api to submit the order
                                //  unfourtunately there is no way to check the status (complete or in process) via the api
                                const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('submitorder');
                                return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
                                  .then ( order => {

                                    const msg_header = 'order submitted for';
                                    const msg = ordered_scene;
                                    APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg)


                                    //create the download request json of course the the order will need to be completed before it can be downloaded
                                    //  since their is no way via api to check and verify the status of the order we have to hope it is completed
                                    var products;
                                    const entityIds = [ordered_scene]
                                    const download_body = USGS_FUNCTION.usgsapi_download(apiKey, node, datasetName, products, entityIds)



                                  })
                                  //catch errors for the submitorder
                                  .catch( (error) => {
                                    const msg_header = 'submitorder api';
                                    const msg = error.message;
                                    APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg)
                                    Failed_Order.push(entityIds[0])

                                  });
                              })
                              //catch errors for adding the order
                              .catch( (error) => {
                                const msg_header = 'updateorderscene api';
                                const msg = error.message;
                                APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg)
                                Failed_Order.push(entityIds[0])
                              });


                        }

                      })

                  }


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



              }).catch( (error) => {

                msg_header = 'could not determine for scene: ' + scene_id;
                msg = error.message;
                console.error(msg + ': ' + scene_id)
                // msg = DownloadScenes.iscomplete();
                //
                // DownloadScenes.add_failed(msg_header, scene_id);
                // APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);


              });

            }).catch( (error) => {
              msg_header = 'last promise error';
              msg = error.message;
              console.error(msg_header + ': ' + msg)

              // APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);

            });
                // const list = {apiKey, scene_id, node, datasetName, acquisition_date}
        // write_file('test-orders', list, false)

      }).catch( (error) => {
        msg_header = 'api';
        msg = error.message;
        console.error(msg_header + ': ' + msg)

        // APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);

        });

})

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

query.on('error', function(err) {
    msg_header = 'query error';
    msg = err.message;
    APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg);
  });

query.on('end', function(result) {
    DownloadScenes.set_total(result.rowCount);
  });
