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

//setup shared helpers
var apphelpers = require('./lib/helpers/app_helpers.js')
var APP_HELPERS = apphelpers();

//setup failure email
var emailer = require('./lib/email/send_error_email.js');
var error_email = emailer()

//call delete old files
APP_HELPERS.delete_old_files('order_landsat_data', 'logs/', '.log');
APP_HELPERS.set_logfile('order_landsat_data')

const LOG_LEVEL_DEBUG = 'debug';
const LOG_LEVEL_ERR = 'error';
const LOG_LEVEL_INFO = 'info';

//config data
const CONFIG_YAML = yaml.load("./lib/usgs_api/config.yaml");

var total_orders = 0

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

//LT50250362011032PAC01
//LT50250352011016PAC01

//set the SQL query to retreive scenes that need to be ordered
const scenes_for_dowloading_SQL = "SELECT " + scenes_fields + " FROM landsat_metadata WHERE needs_ordering = 'YES' AND (ordered = 'NO' or ordered IS NULL or ordered = '')"

// const scenes_for_dowloading_SQL = "SELECT " + scenes_fields + " FROM landsat_metadata WHERE sensor = 'LANDSAT_TM' ORDER BY acquisition_date DESC OFFSET 2000 LIMIT 1000"

//captures lastpromise first one is resolved
var lastPromise = Promise.resolve();

//Qiery the LSF database for scences that need to ordered
const query = pg_client.query(scenes_for_dowloading_SQL);

//login and get promise for api key
var api_key_main = USGS_HELPER.get_api_key();

var count = 0;

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

      count = count + 1

      var entityIds = [scene_id]
      console.log('checking: ' + scene_id)
      APP_HELPERS.write_message(LOG_LEVEL_INFO, 'checking', scene_id)

      var request_body = {apiKey, node, datasetName, entityIds};

      APP_HELPERS.write_message(LOG_LEVEL_DEBUG, 'getorderproducts request', JSON.stringify(request_body));

      const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('getorderproducts');

      //actual request after the last promise has been resolved
      return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
      .then( getorderproducts_response => {

        APP_HELPERS.write_message(LOG_LEVEL_DEBUG, 'getorderproducts response', getorderproducts_response);

        // ensure there was a response
        if(getorderproducts_response ){

          //sometimes there is a response the but the response is empty
          //  this can happen when a api varriable is set to something wrong.
          //  such as a wrong sensor id for the scene which we get from USGS_HELPER.get_datasetName
          if(getorderproducts_response.length > 0){


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

              APP_HELPERS.write_message(LOG_LEVEL_DEBUG, 'updateorderscene request', JSON.stringify(request_body));

              //send request to USGS api to add the scene as an order
              const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('updateorderscene');

                return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
                    .then( order_response => {

                      APP_HELPERS.write_message(LOG_LEVEL_DEBUG, 'updateorderscene response', order_response);

                      //make request json for submitting the order
                      const ordered_scene = entityIds[0]
                      const request_body = USGS_FUNCTION.usgsapi_submitorder(apiKey, node)

                      //send request to USGS api to submit the order
                      //  unfourtunately there is no way to check the status (complete or in process) via the api
                      const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('submitorder');

                      APP_HELPERS.write_message(LOG_LEVEL_DEBUG, 'submitorder request', JSON.stringify(request_body));
                      console.log('  ordering scene: ' + ordered_scene)
                      APP_HELPERS.write_message(LOG_LEVEL_INFO, 'ordering scene', ordered_scene)

                      return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
                        .then ( order => {

                          APP_HELPERS.write_message(LOG_LEVEL_INFO, 'submitorder response', order);

                          update_lsf_database.update_database_ordered(scene_id)

                          APP_HELPERS.write_message(LOG_LEVEL_INFO, 'submited order for', scene_id);

                          //if at end, and all orders procesed write out end of ordering
                          if(count >= total_orders){
                            APP_HELPERS.write_message(LOG_LEVEL_INFO, 'ordering data end', '')
                          }

                     })
                     .catch( (error) => {
                       msg_header = 'submitorder: ';
                       msg = error.message;
                       APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg);
                     });

                })
                .catch( (error) => {
                  msg_header = 'updateorderscene: ';
                  msg = error.message;
                  APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg);
                });

            } else {
              msg_header = 'Nothing to order for scene ';
              msg = scene_id;
              APP_HELPERS.write_message(LOG_LEVEL_DEBUG, msg_header, msg);
            }

          } else {
            msg_header = 'There was nothing in the get order response for scene ';
            msg = scene_id;
            APP_HELPERS.write_message(LOG_LEVEL_DEBUG, msg_header, msg);
          }

        } else {
          msg_header = ''
          msg = 'The get order response was empty, for scene ' + scene_id + '.  So nothing was ordered.  ' +
                        'There are time when a scene cannot be ordered for an unkown reason.  ' +
                        'We can attempt to order the scene in next run.'
          APP_HELPERS.write_message(LOG_LEVEL_DEBUG, msg_header, msg);
        }

        //if at end, and all orders procesed write out end of ordering
        if(count >= total_orders){
          APP_HELPERS.write_message(LOG_LEVEL_INFO, 'ordering data end', '')
        }

      })
      .catch( (error) => {

        msg_header = 'get order products: ';
        msg = error.message;
        APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg);

      });
    })
  })
})

query.on('error', function(err) {
  msg_header = 'query error';
  msg = err.message;
  APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg);
});

query.on('end', function(result) {
  msg_header = 'query completed';
  total_orders = result.rowCount
  const message = result.rowCount === 1 ? ' scene that need to ordered' : ' scenes that need to ordered'
  msg = result.rowCount + message;
  APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);
  if(result.rowCount === 0){
    APP_HELPERS.write_message(LOG_LEVEL_INFO, 'ordering data end', '')
  }
});
