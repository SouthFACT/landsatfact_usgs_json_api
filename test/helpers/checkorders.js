var yaml = require('yamljs');
var pg = require('pg');
var fs = require('fs');
var winston = require('winston');
var axios = require('axios');


//get modules
var USGS_CONSTANT = require("../../lib/usgs_api/usgs_constants.js");
var USGS_FUNCTION = require("../../lib/usgs_api/usgs_functions.js");
var USGS_HELPER = require("../../lib/usgs_api/usgs_helpers.js");
var PG_HANDLER = require('../../lib/postgres/postgres_handlers.js')

var apphelpers = require('../../lib/helpers/app_helpers.js')
var APP_HELPERS = apphelpers();

var emailer = require('../../lib/email/send_error_email.js');
var error_email = emailer()

var download_counter = require('../../download_counter.js');
var DownloadCounter = download_counter();

const LOG_LEVEL_ERR = 'error';
const LOG_LEVEL_INFO = 'info';

//call delete old files
APP_HELPERS.delete_old_files('check_orders_landsat_data', 'logs/', '.log');

APP_HELPERS.set_logger_level('debug');
APP_HELPERS.set_logfile('check_orders_landsat_data')
APP_HELPERS.write_message(LOG_LEVEL_INFO, 'check order start', '');

//set base URL for axios
axios.defaults.baseURL = USGS_CONSTANT.USGS_URL;


function make_scene_available_request(USGS_REQUEST_CODE, request_body, scene_id){
  return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
   .then( downloads => {

     // nothing to return so write out failed????
     if(!downloads[0]){
       var msg_header = 'nothing in download options, there might be something wrong with the scene id or USGS is missing this scene from the API call to downloadoptions.'
       var msg = scene_id
       APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg);
     }

     //get the orders option for the standard
     const standard_option_order = downloads[0].downloadOptions.filter( options => {
       return options.downloadCode === "STANDARD" && options.available
     })

     if(standard_option_order.length > 0){
       var msg_header = ' The scene ' + scene_id + ' is now available please proceed to download'
       var msg = scene_id
       APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);

       //add downoload....

     } else {
       var msg_header = ' The scene ' + scene_id + ' is still not available check again later...'
       var msg = scene_id
       APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);
     }

   })
   //catch errors for the submitorder
   .catch( (error) => {
     if(error.message.indexOf('Rate limit exceeded - cannot support simultaneous requests') > 0){
       console.log('simultaneous retry')
       return make_scene_available_request(USGS_REQUEST_CODE, request_body, scene_id);
     } else {
       const msg_header = 'check orders available';
       const msg = error.message;
       APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg);
     }
   });
}

//get the orders and see if available
function check_orders(orders_from_number_of_days_ago){


            //have
            var lastPromise = Promise.resolve();

            const daysago_string = APP_HELPERS.date_by_subtracting_days(new Date(),orders_from_number_of_days_ago)

            //format a day string for writing failires
            const days_ago = APP_HELPERS.get_date_string(daysago_string)

            const ordered_products_file = 'ordered-' + days_ago + '.txt';

            //get the orders from date and check if available
            const list_of_orders = APP_HELPERS.file_list_to_array(ordered_products_file)

            const list_of_ordered_scenes = APP_HELPERS.list_array_to_sql_list(list_of_orders);

            const last_day_scenes_fields = ' scene_id, sensor, acquisition_date, browse_url, path, row, cc_full, cc_quad_ul, cc_quad_ur, cc_quad_ll, cc_quad_lr, data_type_l1 ';

            const select_orders_SQL =  'SELECT' +
                                    last_day_scenes_fields +
                                    ' FROM landsat_metadata ' +
                                    ' WHERE scene_id in ' +
                                    list_of_ordered_scenes;


            //login and get promise for api key
            var api_key_co = USGS_HELPER.get_api_key();

            //get config data
            const PG_CONNECT = yaml.load("./lib/postgres/config.yaml");

            //connect to db
            const pg_client = PG_HANDLER.pg_connect(PG_CONNECT)

            //query db
            const query = pg_client.query(select_orders_SQL);

            //handle query
            query.on('row', function(row, result) {

              // process rows here
              api_key_co
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

                    //actual request after the last promise has been resolved
                    return make_scene_available_request(USGS_REQUEST_CODE, request_body, scene_id);

                  })
                  //catch errors for the submitorder
                  .catch( (error) => {
                    const msg_header = 'last promise check order';
                    const msg = error.message;
                    APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg);
                  });



              })
              //catch errors for the submitorder
              .catch( (error) => {
                const msg_header = 'api key';
                const msg = error.message;
                APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg);
              });

            })


            //handle query error
            query.on('error', function(err) {
            });

            //handle query end
            query.on('end', function(result) {
              thecount = result.rowCount;
            });


}

//current orders
check_orders(0);

//yesterdays orders
check_orders(1);


APP_HELPERS.write_message(LOG_LEVEL_INFO, 'check order end', '');
