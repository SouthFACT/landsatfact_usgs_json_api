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
APP_HELPERS.delete_old_files('download_landsat_data');
APP_HELPERS.delete_old_files('order_failed');
APP_HELPERS.delete_old_files('download_failed');
APP_HELPERS.delete_old_files('downloaded');
APP_HELPERS.delete_old_files('ordered');


APP_HELPERS.set_logfile('download_landsat_data')



const LOG_LEVEL_ERR = 'error';
const LOG_LEVEL_INFO = 'info';

//config data
const CONFIG_YAML = yaml.load("./lib/usgs_api/config.yaml");

var scene_downloads = [];
var orders = [];

APP_HELPERS.set_logger_level('debug');

APP_HELPERS.write_message(LOG_LEVEL_INFO, 'download data start', '');


//set base URL for axios
axios.defaults.baseURL = USGS_CONSTANT.USGS_URL;

//get config data
const PG_CONNECT = yaml.load("./lib/postgres/config.yaml");

const pg_client = PG_HANDLER.pg_connect(PG_CONNECT)

const scene_arg = process.argv[2]

const last_day_scenes_fields = ' scene_id, sensor, acquisition_date, browse_url, path, row, cc_full, cc_quad_ul, cc_quad_ur, cc_quad_ll, cc_quad_lr, data_type_l1 ';

const list_yesterdays_failed = APP_HELPERS.get_yesterdays_failures();
const yesterdays_failed_scenes =  'SELECT' +
                                    last_day_scenes_fields +
                                  ' FROM landsat_metadata ' +
                                  ' WHERE scene_id in ' + list_yesterdays_failed;



const last_day_scenes = " (SELECT " +
                          last_day_scenes_fields +
                        " FROM landsat_metadata  WHERE scene_id in ('LE70220342003237EDC01')"

                        // ,'LT50300402003237PAC02','LT50300392003237PAC02')
// ,'LE70330382016238EDC00','LE70170382016238EDC00'

//acquisition_date =  '2003-08-25'::date AND

// "SELECT " + last_day_scenes_fields + " FROM vw_last_days_scenes";

var scenes_for_dowloading_SQL = yesterdays_failed_scenes +
                      " UNION " +
                      last_day_scenes;



//check if there is an argument of a scene if so use that.
if( scene_arg ){
  scenes_for_dowloading_SQL = "SELECT " + last_day_scenes_fields + " FROM landsat_metadata  WHERE scene_id = '" + scene_arg + "'";
}

// //captures lastpromise first one is resolved
var lastPromise = Promise.resolve();

const query = pg_client.query(scenes_for_dowloading_SQL);

//login and get promise for api key
var api_key_main = USGS_HELPER.get_api_key();

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

                //get the orders option for the standard
                const standard_option_order = downloads[0].downloadOptions.filter( options => {
                  return options.downloadCode === "STANDARD" && !options.available
                })

                //get the download option for the standard
                const standard_option_dowload = downloads[0].downloadOptions.filter( options => {
                  return options.downloadCode === "STANDARD" && options.available
                })

                const entityId = downloads[0].entityId;
                const entityIds = [entityId]

                //create array to hold the request json for all orders
                if(standard_option_order.length > 0){
                  const orders_obj = {apiKey,node,datasetName,entityIds};
                  orders.push(orders_obj);
                  DownloadScenes.add_order(orders_obj)
                }

                //create array to hold the request json for all downloads
                if(standard_option_dowload.length > 0){
                  const download_obj = {apiKey,node,datasetName,products,entityIds};
                  scene_downloads.push(download_obj);
                  DownloadScenes.add_download(download_obj)
                }

                var msg_header = 'Total';
                var msg = DownloadScenes.get_total_count();
                APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);

                msg_header = 'Current';
                msg = DownloadScenes.get_current_count();
                APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);

                msg_header = 'Complete';
                msg = DownloadScenes.iscomplete();
                APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);

                //once we have completed adding all the scenes to either ordering or downloading
                //  start the process to actually order and download products
                //  again we have to start after completion because we are limited to one API call at time.
                if( DownloadScenes.iscomplete() ) {
                  DownloadScenes.start_order()
                }


            }).catch( (error) => {

              // failed_downloads.push({scene_id});
              // console.log('dowload options api: ' + error.message);
              msg_header = 'download failed for scene';
              msg = DownloadScenes.iscomplete();

              DownloadScenes.add_failed(msg_header, scene_id);
              APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);

              //logger.log('error', 'download failed for scene: ' + scene_id);
              // logger.log('error', 'dowload api: ' + error.message);

            });

        }).catch( (error) => {
          msg_header = 'last promise error';
          msg = error.message;
          APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);

        });

      }).catch( (error) => {
        msg_header = 'api';
        msg = error.message;
        APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);

        });




    // wait for order to complete every n seconds via usgs api?  this may take tooo long no I have one in process for a few days.
    //it seems that currently all scenes are in progesss.



  });

query.on('error', function(err) {
    console.log(err);
    logger.log('error', 'query error: ' + err.message);

  });

query.on('end', function(result) {
    DownloadScenes.set_total(result.rowCount);
  });
