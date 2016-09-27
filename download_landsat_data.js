var axios = require('axios');

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

var emailer = require('./lib/email/send_error_email.js');
var error_email = emailer()

//check if a file exists synchronously
function file_exists(path) {
  try {
    fs.accessSync(path, fs.F_OK);
      return true
    } catch (e) {
      return false
    }
}

//get todays data as string
today = get_date_string()

//delete a file used to manage logs and failed download and error files
function delete_file(file){

  //check if file exists
  the_file_exists = file_exists(file);

  //if the file exists delete it.
  if(the_file_exists){
    fs.unlink(file,function(err){
         if(err) {
           return console.log(err);
         }

         msg_header = 'old file deleted';
         msg = file;
         write_message(LOG_LEVEL_INFO, msg_header, msg)

     });
  }
}

//deletes old log and failure files (older than 7 days)
function delete_old_files(){

  const week_ago = date_by_subtracting_days(new Date(),7)
  week_ago_string = get_date_string(week_ago)

  var file = 'logs/download_landsat_data-' + week_ago_string+ '.log'
  delete_file(file)

  file = './order_failed-' + week_ago_string+ '.txt'
  delete_file(file)

  file = './download_failed-' + week_ago_string+ '.txt'
  delete_file(file)


}


//call delete old files
delete_old_files();

//setup logger
var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({ filename: 'logs/download_landsat_data-' + today+ '.log'})
  ]
});

//max amount concurent simultaneous downloads from the USGS api
//  it is 10 in ten minutes but we are limiting to a 5 at a time so we are not
//  overloading the server
const MAX_DOWNLOADS_AT_A_TIME = 5;
const LOG_LEVEL_ERR = 'error';
const LOG_LEVEL_INFO = 'info';

//config data
const CONFIG_YAML = yaml.load("./lib/usgs_api/config.yaml");


const download_directory = CONFIG_YAML.download_directory;
const DOWNLOAD_DIR = download_directory;
const DOWNLOAD_FILE_DIR = '';






//generic counter for qeueing the # of concurent downloads
var DownloadCounter = (function() {

  //counter
  var privateCounter = 1;

  //increment or decrment counter
  function changeBy(val) {
    privateCounter += val;
  }

  //methods to do something to counter
  return {
    //increment the counter by 1
    increment: function() {
      changeBy(1);
    },
    //decrement the counter by 1
    decrement: function() {
      changeBy(-1);
    },
    //return the current value of the counter
    value: function() {
      return privateCounter;
    }
  };
})();

// remove on day from current day
function date_by_subtracting_days(date, days) {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() - days,
        date.getHours(),
        date.getMinutes(),
        date.getSeconds(),
        date.getMilliseconds()
    );
}

//get yesterdays download failures and add get a SQL list
//  so we can add it to todays list.  if it fails it should again it will end up back on the
//  download list
function get_yesterdays_failures() {

  var list = "";
  const dayago_string = date_by_subtracting_days(new Date(),1)

  //format a day string for writing failires
  const dayago = get_date_string(dayago_string)
  // d.getFullYear()+""+("0" + (d.getMonth() + 1)).slice(-2)+""+("0" + d.getDate()).slice(-2)

  const file = 'download_failed-' + dayago + '.txt';

  fs.readFileSync('download_failed-' + dayago + '.txt').toString().split('\n').forEach(function (line) {
    list = list + "'" + line  + "',";
  });


  list  = "(" + list.substring(0,list.length-1) + ")"
  return list

}

//function to create a sting from the current date for writing logs and other files...
function get_date_string(date){
  var date;

  if(!date){
    the_date = new Date()
  } else {
    the_date = date
  }

  return the_date.getFullYear()+""+("0" + (the_date.getMonth() + 1)).slice(-2)+""+("0" + the_date.getDate()).slice(-2)
}

//generic holder of downloads
var DownloadScenes = (function() {
  var DownloadScenes = [];
  var scenes_in_download = [];

  var total_scenes_for_download = 0;
  var OrderScenes = [];
  var scenes_in_order = [];

  var Failed_Download = [];
  var Failed_Order = [];
  var Succeed_Download= [];
  var Succeed_Order = [];

  var total_count = 0;
  var count = 0;

  //get the dest file name
  function get_file_dest(file){

    today = get_date_string();

    switch (file) {
      case "dowloaded":
        return DOWNLOAD_FILE_DIR + 'downloaded.txt'
        break;
      case "ordered":
        return DOWNLOAD_FILE_DIR + 'ordered.txt'
        break;
      case "order failed":
        return DOWNLOAD_FILE_DIR + 'order_failed-' + today + '.txt'
        break;
      case "download failed":
        return DOWNLOAD_FILE_DIR + 'download_failed-' + today + '.txt'
        break;
      default:
        return DOWNLOAD_FILE_DIR + 'downloaded.txt'
    }
  }

  //write the file for failed and dowloaded scenes
  function write_file(file, list, usephp){

    console.log(file + ' writing file..')

    //get file destination
    const dest = get_file_dest(file);

    // temporary data holder
    var file = fs.createWriteStream(dest);

    //file originally written by php so need to mimic the output.
    //  will talk to everyone about how to change it.
    if(usephp){
      file.write("Array\n")
      file.write("(\n")
    }

    var count = 0;

    if(list.length === 0){
      file.write("\n");
    }

    list.map( datachunk => {
      var start = "";
      var end = ""

      if(usephp){
        start = "    [";
        end = "] => ";
      }

      if(!usephp){
        count = "";
      }

      file.write(start + count + end + datachunk + "\n");

      count = increment_count(count,1);

    })

    if(usephp){
      file.write(")\n")
    }

  }
  //
  function increment_count(count, val) {
    const current_count = count;
    return current_count += val;
  }

  //generic message for logging and console writing
  function write_message(level, msg, val){
    console.error(msg + ': ' + val);
    logger.log(level, msg + ': ' + val);
  }

  function order(){

    //create a promise already resolved to catch all response.
    //  becuase USGS api is throttled for one request at a time
    //  wrap this in a resolve promoise so the there all requests are in promise and each one has
    //  to be resolved befire the next promise is started.  This is due to only limitations of the USGS API- only allows one
    //  api call at at time,
    var lastPromise = Promise.resolve();
    const totalorders = OrderScenes.length

    //no orders then just go directly to download
    if(OrderScenes.length === 0){
      download();
    }

    //walk throug all the ordered scenes
    OrderScenes.map( order => {

      //start with resolved promise
      return lastPromise = lastPromise.then( () => {

        //count this as one order.  neeed to count each order
        //  so we know when we have completed all orders. so once all the orders failed or submitted equals the length of all the orders in
        //  OrderScenes then we will know all orders have been placed.  and then we can proceed with downloading...
        //  only have to do this to make sure we do not send more than one api call at a time.

        //get the request JSON from the ordercenes array
        const request_body = order;
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

                        const msg_header = 'order submitted for';
                        const msg = ordered_scene;
                        write_message(LOG_LEVEL_INFO, msg_header, msg)


                        //create the download request json of course the the order will need to be completed before it can be downloaded
                        //  since their is no way via api to check and verify the status of the order we have to hope it is completed
                        const products;
                        const entityIds = [ordered_scene]
                        const download_body = USGS_FUNCTION.usgsapi_download(apiKey, node, datasetName, products, entityIds)

                        //  we can add the order request here to the end of the array of downloads that are available.
                        //  if when we get to this it is not available we will deal with the failure in the download section
                        DownloadScenes.push(download_body);
                        Succeed_Order.push(ordered_scene);

                        total_scenes_for_download = increment_count(total_scenes_for_download, 1);
                        //download
                        //wait just in case still sending requests for order.
                        //  only start download when finished to avoid simultaneous api calls :(
                        //  also since we cannot have simultaneous api calls we have to delay the download call to ensure
                        //  the orders have been submitted and there are no more calls to the api (by waiting to till have made the last order)
                        if(totalorders === (Succeed_Order.length + Failed_Order.length)){

                          //only send email if there is failed orders
                          if(Failed_Order.length>0){
                            error_email.set_text('Orders for unprocessed data from the USGS api failed for these scenes: ' + Failed_Order.toString() + '.  Check the attached log for more details.')
                            error_email.set_attachments('./logs/download_landsat_data-' + today+ '.log')
                            error_email.send_email()
                          }

                          write_file('ordered', Succeed_Order, false);
                          write_file('order failed', Failed_Order, false);
                          setTimeout( download() , 5000 )
                        }

                      })
                      //catch errors for the submitorder
                      .catch( (error) => {
                        const msg_header = 'submitorder api';
                        const msg = error.message;
                        write_message(LOG_LEVEL_ERR, msg_header, msg)
                        Failed_Order.push(order.entityIds[0])

                      });
                  })
                  //catch errors for adding the order
                  .catch( (error) => {
                    const msg_header = 'updateorderscene api';
                    const msg = error.message;
                    write_message(LOG_LEVEL_ERR, msg_header, msg)
                    Failed_Order.push(order.entityIds[0])
                  });


            } else {
              //when there are no objects to dowload just jump to the dowload
              //  add wait just in case still sending requests for order.
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
              const msg_header = 'getorderproducts api';
              const msg = error.message;
              write_message(LOG_LEVEL_ERR, msg_header, msg)
              Failed_Order.push(order.entityIds[0])
            }
          });


      //catch all for all other errors with promises
      }).catch( (error) => {
        const msg_header = 'last promise orders';
        const msg = error.message;
        write_message(LOG_LEVEL_ERR, msg_header, msg)
      })

    })
  }

  function download(){
    const total_downloads = DownloadScenes.length

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
            return get_tar(tarFile, dest, scene_id, MAX_DOWNLOADS_AT_A_TIME, total_downloads)
              .then((data) => {
                //do nothing
              })
              .catch((err) => console.error(err));


        })
        .catch( (error) => {
          if(JSON.stringify(error).indexOf('Rate limit exceeded - cannot support simultaneous requests') > 0){
            console.log('retry?')
          } else {
            const msg_header = 'dowload api';
            const msg = error.message;
            write_message(LOG_LEVEL_ERR, msg_header, msg);

            Failed_Download.push(scene_id)
            console.log(Failed_Download.length + ' - downloads failed catch error 353')

          }
        })
      })
      .catch( (error) => {
        const msg_header = 'last promise orders';
        const msg = error.message;
        write_message(LOG_LEVEL_ERR, msg_header, msg);
        Failed_Download.push(scene_id)
        console.log(Failed_Download.length + ' - last promise failed catch error 363')

      })
    })

  }

  //function to get tar files from a passed url
  //  this also turns the download in to promise and Also
  //  limits the # simultaneous downloads to
  const get_tar = function(url, dest, scene_id, simultaneous_donwloads, total_downloads ) {
    //add failed download.txt
    //add succeded download.txt

    const currentDownloads = DownloadCounter.value();

    // return new pending promise
    return new Promise((resolve, reject) => {

      if (file_exists(dest)){
        DownloadCounter.increment();

        Succeed_Download.push(scene_id)

        var msg_header = 'the file ' + dest + ' alread exists, so we do not need to download it.';
        var msg = scene_id

        write_message(LOG_LEVEL_INFO, msg_header, msg);

        if(total_downloads === (Failed_Download.length + Succeed_Download.length)){

          //only send email if there is failed downloads
          if(Failed_Download.length>0){
            error_email.set_text('Downloads from the USGS api failed for these scenes:' + Failed_Download.toString() + '.  Check the attached log for more details.')
            error_email.set_attachments('./logs/download_landsat_data-' + today+ '.log')
            error_email.send_email()
          }

          write_file('downloaded', Succeed_Download, true);
          write_file('download failed', Failed_Download, false);
          msg_header = 'update metadata end';
          msg = '';
          write_message(LOG_LEVEL_INFO, msg_header, msg)

        }

        resolve(dest)
      } else {


                //if url is blank that usually means it needs to ordered add order code
                if(!url){
                  var msg_header = 'url is blank, maybe you need to order the scene or the scene has been ordered and is not ready?';
                  var msg = scene_id
                  Failed_Download.push(scene_id)

                  write_message(LOG_LEVEL_ERR, msg_header, msg);

                  if(total_downloads === (Failed_Download.length + Succeed_Download.length)){

                    //only send email if there is failed downloads
                    if(Failed_Download.length>0){
                      error_email.set_text('Downloads from the USGS api failed for these scenes:' + Failed_Download.toString() + '.  Check the attached log for more details.')
                      error_email.set_attachments('./logs/download_landsat_data-' + today+ '.log')
                      error_email.send_email()
                    }

                    write_file('downloaded', Succeed_Download, true);
                    write_file('download failed', Failed_Download, false);
                    msg_header = 'update metadata end';
                    msg = '';
                    write_message(LOG_LEVEL_INFO, msg_header, msg)

                  }

                  //add scene to faileddownload txt
                  reject(msg_header);
                };

              //define the correct http protocal to make download request
              const lib = url.startsWith('https') ? require('https') : require('http');
              const request = lib.get(url, (response) => {

                // handle http errors
                if (response.statusCode < 200 || response.statusCode > 299) {

                  Failed_Download.push(scene_id)

                  if(total_downloads === (Failed_Download.length + Succeed_Download.length)){

                    //only send email if there is failed downloads
                    if(Failed_Download.length>0){
                      error_email.set_text('Downloads from the USGS api failed for these scenes:' + Failed_Download.toString() + '.  Check the attached log for more details.')
                      error_email.set_attachments('./logs/download_landsat_data-' + today+ '.log')
                      error_email.send_email()
                    }

                    write_file('downloaded', Succeed_Download, true);
                    write_file('download failed', Failed_Download, false);
                    msg_header = 'update metadata end';
                    msg = '';
                    write_message(LOG_LEVEL_INFO, msg_header, msg)

                  }

                    reject(new Error('Failed to load page, status code: ' + response.statusCode));
                 }

                // temporary data holder
                var file = fs.createWriteStream(dest);

                msg_header = 'Downloading';
                msg = dest;
                write_message(LOG_LEVEL_INFO, msg_header, msg);

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

                  Succeed_Download.push(dest);

                  if(total_downloads === (Failed_Download.length + Succeed_Download.length)){

                    //only send email if there is failed downloads
                    if(Failed_Download.length>0){
                      error_email.set_text('Downloads from the USGS api failed for these scenes:' + Failed_Download.toString() + '.  Check the attached log for more details.')
                      error_email.set_attachments('./logs/download_landsat_data-' + today+ '.log')
                      error_email.send_email()
                    }

                    write_file('downloaded', Succeed_Download, true);
                    write_file('download failed', Failed_Download, false);
                    const msg_header = 'update metadata end';
                    const msg = '';
                    write_message(LOG_LEVEL_INFO, msg_header, msg)

                  }

                  resolve(dest);
                  //add scene to download txt
                  //remove one from downoload counter so we can start a new download
                  DownloadCounter.decrement();
                });

              });

      }

      // handle connection errors of the request
      request.on('error', (err) => {
        //add scene to faileddownload txt
          reject(err)
        })
      })
  };


  // function
  return {
    add_download: function(val) {
      count = increment_count(count, 1);
      total_scenes_for_download = increment_count(total_scenes_for_download, 1);
      DownloadScenes.push(val);

      return val;
    },
    add_order: function(val) {
      count = increment_count(count, 1);
      OrderScenes.push(val);

      return val;
    },
    write_message: function(level, msg, val){
      write_message(level, msg, val);
      return null
    },
    add_failed: function(msg,val) {
      count = increment_count(count, 1);
      Failed_Download.push(val);
      write_message(LOG_LEVEL_ERR, msg, val)
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

//get config data
const PG_CONNECT = yaml.load("./lib/postgres/config.yaml");

const pg_client = PG_HANDLER.pg_connect(PG_CONNECT)

const scene_arg = process.argv[2]

const list_yesterdays_failed = get_yesterdays_failures();
const yesterdays_failed_scenes =  'SELECT scene_id, sensor, acquisition_date, browse_url, path, row, cc_full, cc_quad_ul, cc_quad_ur, cc_quad_ll, cc_quad_lr, data_type_l1 ' +
                                  ' FROM landsat_metadata ' +
                                  ' WHERE scene_id in ' + list_yesterdays_failed;

var last_day_scenes = yesterdays_failed_scenes +
                      " UNION " +
                      " (SELECT scene_id, sensor, acquisition_date, browse_url, path, row, cc_full, cc_quad_ul, cc_quad_ur, cc_quad_ll, cc_quad_lr, data_type_l1 " +
                      " FROM landsat_metadata  WHERE acquisition_date =  '2003-08-25'::date AND scene_id in ('LE70220342003237EDC01','LT50300402003237PAC02','LT50300392003237PAC02'))"



if( scene_arg ){
  last_day_scenes = "SELECT * FROM landsat_metadata  WHERE scene_id = '" + scene_arg + "'";
}

// console.log(process.argv[2])
// return
//
// var

//query db and get the last days scenes

//WHERE acquisition_date =  '2003-08-25'::date LIMIT 9"

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
                DownloadScenes.write_message(LOG_LEVEL_INFO, msg_header, msg);

                msg_header = 'Current';
                msg = DownloadScenes.get_current_count();
                DownloadScenes.write_message(LOG_LEVEL_INFO, msg_header, msg);

                msg_header = 'Complete';
                msg = DownloadScenes.iscomplete();
                DownloadScenes.write_message(LOG_LEVEL_INFO, msg_header, msg);

                //once we have completed adding all the scenes to either ordering or downloading
                //  start the process to actually order and download products
                //  again we have to start after completion because we are limited to one API call at time.
                if( DownloadScenes.iscomplete() ) {
                  DownloadScenes.start_order()
                }


            }).catch( (error) => {

              // failed_downloads.push({scene_id});
              // console.log('dowload options api: ' + error.message);
              DownloadScenes.add_failed('download failed for scene:', scene_id);
              //
              // logger.log('error', 'download failed for scene: ' + scene_id);
              // logger.log('error', 'dowload api: ' + error.message);

            });

        }).catch( (error) => {
          console.log('last promise error: ' + error.message);
          logger.log('error', 'last promise error: ' + error.message);

        });

      }).catch( (error) => {
         console.log('api: ' + error.message);
         logger.log('error', 'api: ' + error.message);
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
