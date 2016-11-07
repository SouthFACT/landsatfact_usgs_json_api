var yaml = require('yamljs');
var pg = require('pg');
var fs = require('fs');
var winston = require('winston');
var axios = require('axios');


//get modules
var USGS_CONSTANT = require("../usgs_api/usgs_constants.js");
var USGS_FUNCTION = require("../usgs_api/usgs_functions.js");
var USGS_HELPER = require("../usgs_api/usgs_helpers.js");
var PG_HANDLER = require('../postgres/postgres_handlers.js')

var apphelpers = require('../helpers/app_helpers.js')
var APP_HELPERS = apphelpers();

var emailer = require('../email/send_error_email.js');
var error_email = emailer()

var download_counter = require('../../download_counter.js');
var DownloadCounter = download_counter();


const LOG_LEVEL_ERR = 'error';
const LOG_LEVEL_INFO = 'info';

//call delete old files
APP_HELPERS.delete_old_files('download_landsat_data');

APP_HELPERS.set_logger_level('debug');
APP_HELPERS.set_logfile('download_landsat_data')


//generic holder of downloads move to seperate module
var DownloadScenes = function() {
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

  //config data

  const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR
  const DOWNLOAD_FILE_DIR = process.env.DOWNLOAD_FILE_DIR
  const DOWNLOAD_FILE_LCV_DIR = process.env.DOWNLOAD_FILE_LCV_DIR

  //max amount concurent simultaneous downloads from the USGS api
  //  it is 10 in ten minutes but we are limiting to a 5 at a time so we are not
  //  overloading the server
  const MAX_DOWNLOADS_AT_A_TIME = 5;


  //get the dest file name
  function get_file_dest(file){

    today = APP_HELPERS.get_date_string();

    switch (file) {
      case "downloadedorig":
        return DOWNLOAD_FILE_LCV_DIR + 'downloaded.txt'
        break;
      case "dowloaded":
        return DOWNLOAD_FILE_DIR + 'downloaded-' + today + '.txt'
        break;
      case "ordered":
        return DOWNLOAD_FILE_DIR + 'ordered-' + today + '.txt'
        break;
      case "order failed":
        return DOWNLOAD_FILE_DIR + 'order_failed-' + today + '.txt'
        break;
      case "download failed":
        return DOWNLOAD_FILE_DIR + 'download_failed-' + today + '.txt'
        break;
      default:
        return DOWNLOAD_FILE_DIR + 'downloaded-' + today + '.txt'
    }
  }

  //write the file for failed and dowloaded,ordered scenes
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
                        APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg)


                        //create the download request json of course the the order will need to be completed before it can be downloaded
                        //  since their is no way via api to check and verify the status of the order we have to hope it is completed
                        var products;
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
                            console.log('failed order email send')
                            error_email.set_text('Orders for unprocessed data from the USGS api failed for these scenes: ' + Failed_Order.toString() + '.  Check the attached log for more details.')
                            error_email.set_attachments('./logs/download_landsat_data-' + today+ '.log')
                            error_email.send_email()
                          }

                          write_file('ordered', Succeed_Order, false);
                          write_file('order failed', Failed_Order, false);
                          setTimeout( download() , 10 )
                        }

                      })
                      //catch errors for the submitorder
                      .catch( (error) => {
                        const msg_header = 'submitorder api';
                        const msg = error.message;
                        APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg)
                        Failed_Order.push(order.entityIds[0])

                      });
                  })
                  //catch errors for adding the order
                  .catch( (error) => {
                    const msg_header = 'updateorderscene api';
                    const msg = error.message;
                    APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg)
                    Failed_Order.push(order.entityIds[0])
                  });


            } else {
              //when there are no objects to dowload just jump to the dowload
              //  add wait just in case still sending requests for order.
              setTimeout( download() , 10 )
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
              APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg)
              Failed_Order.push(order.entityIds[0])
            }
          });


      //catch all for all other errors with promises
      }).catch( (error) => {
        const msg_header = 'last promise orders';
        const msg = error.message;
        APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg)
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

            //make sure there was a response
            if (download_response[0]){
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

            //there was no url so we need to fail it
            } else {
              const msg_header = 'download api - no url';
              const msg = error.message + ' --- '+ request_body.entityIds[0];

              APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg);
              Failed_Download.push(request_body.entityIds[0])
            }




        })
        .catch( (error) => {
          if(JSON.stringify(error).indexOf('Rate limit exceeded - cannot support simultaneous requests') > 0){
            console.log('retry?')
          } else {
            const msg_header = 'download api failed not rate limit';
            const msg = error.message + ' --- '+ request_body.entityIds[0];

            APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg);
            Failed_Download.push(request_body.entityIds[0])
          }
        })
      })
      .catch( (error) => {
        const msg_header = 'last promise orders';
        const msg = error.message;
        APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg);
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

      if (APP_HELPERS.file_exists(dest)){
        DownloadCounter.increment();

        Succeed_Download.push(scene_id)

        var msg_header = 'the file ' + dest + ' alread exists, so we do not need to download it.';
        var msg = scene_id

        APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);

        if(total_downloads === (Failed_Download.length + Succeed_Download.length)){

          //only send email if there is failed downloads
          if(Failed_Download.length>0){
            console.log('failed download email send')
            error_email.set_text('Downloads from the USGS api failed for these scenes: ' + Failed_Download.toString() + '.  Check the attached log for more details.')
            error_email.set_attachments('./logs/download_landsat_data-' + today+ '.log')
            error_email.send_email()
          }

          write_file('downloaded', Succeed_Download, false);
          write_file('downloadedorig', Succeed_Download, true);

          write_file('download failed', Failed_Download, false);
          msg_header = 'dowload data end';
          msg = '';
          APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg)

        }

        resolve(dest)
      } else {


                //if url is blank that usually means it needs to ordered add order code
                if(!url){
                  var msg_header = 'url is blank, maybe you need to order the scene or the scene has been ordered and is not ready?';
                  var msg = scene_id
                  Failed_Download.push(scene_id)

                  APP_HELPERS.write_message(LOG_LEVEL_ERR, msg_header, msg);

                  if(total_downloads === (Failed_Download.length + Succeed_Download.length)){

                    //only send email if there is failed downloads
                    if(Failed_Download.length>0){
                      console.log('failed download email send')
                      error_email.set_text('Downloads from the USGS api failed for these scenes: ' + Failed_Download.toString() + '.  Check the attached log for more details.')
                      error_email.set_attachments('./logs/download_landsat_data-' + today+ '.log')
                      error_email.send_email()
                    }

                    write_file('downloaded', Succeed_Download, false);
                    write_file('downloadedorig', Succeed_Download, true);

                    write_file('download failed', Failed_Download, false);
                    msg_header = 'update metadata end';
                    msg = '';
                    APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg)

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
                      console.log('failed download email send')
                      error_email.set_text('Downloads from the USGS api failed for these scenes: ' + Failed_Download.toString() + '.  Check the attached log for more details.')
                      error_email.set_attachments('./logs/download_landsat_data-' + today+ '.log')
                      error_email.send_email()
                    }

                    write_file('downloaded', Succeed_Download, false);
                    write_file('downloadedorig', Succeed_Download, true);

                    write_file('download failed', Failed_Download, false);
                    msg_header = 'update metadata end';
                    msg = '';
                    APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg)

                  }

                    reject(new Error('Failed to load page, status code: ' + response.statusCode));
                 }

                // temporary data holder
                var file = fs.createWriteStream(dest);

                msg_header = 'Downloading';
                msg = dest;
                APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg);

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
                      console.log('failed download email send')
                      error_email.set_text('Downloads from the USGS api failed for these scenes: ' + Failed_Download.toString() + '.  Check the attached log for more details.')
                      error_email.set_attachments('./logs/download_landsat_data-' + today+ '.log')
                      error_email.send_email()
                    }

                    write_file('downloaded', Succeed_Download, false);
                    write_file('downloadedorig', Succeed_Download, true);

                    write_file('download failed', Failed_Download, false);
                    const msg_header = 'update metadata end';
                    const msg = '';
                    APP_HELPERS.write_message(LOG_LEVEL_INFO, msg_header, msg)

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
    add_failed: function(msg,val) {
      count = increment_count(count, 1);
      Failed_Download.push(val);
      APP_HELPERS.write_message(LOG_LEVEL_ERR, msg, val)
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


};

module.exports = DownloadScenes;
