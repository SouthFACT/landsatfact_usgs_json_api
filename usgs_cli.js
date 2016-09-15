var axios = require('axios');
var program = require('commander');
var fs = require('fs');

//get modules
var USGS_CONSTANT = require("./lib/usgs_api/usgs_constants.js");
var USGS_FUNCTION = require("./lib/usgs_api/usgs_functions.js");
var USGS_HELPER = require("./lib/usgs_api/usgs_helpers.js");

//args
program
    .version('0.0.1')
    .usage('[options] ')
    .option('-r, --request_code <request code>', 'request code see http://earthexplorer.usgs.gov/inventory/documentation/json-api for valide codes', String)
    .option('-q, --request_json <json text>', 'request json as text', String)
    .option('-f, --request_file <json file>', 'request json in text <file>', String)
    .parse(process.argv);


//set base URL for axios
axios.defaults.baseURL = USGS_CONSTANT.USGS_URL;

//login and get promise for api key
var api_key = USGS_HELPER.get_api_key();

//check json input
var input_json;
if (program.request_json){
  //if -q is passed then use that even of both the file and and json is passed
  input_json = program.request_json;
} else {
  //make sure a file was passed in
  if (program.request_file){
    fs.readFile( program.request_file , (err, data) => {

      //if not valid file throw an error
      if (err) throw err;

      //if file is valid get the json data
      input_json = data;

    });

  }
}

//if promised resolved do task
api_key
  .then( (data) => {
    //set apikey
    const apiKey = data;
    //get usgs request code
    const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code(program.request_code);

    //convert apikey to json object
    const apiKey_json = {apiKey};

    //convert json request into json object
    const request_json = JSON.parse(input_json);

    //merge apikey json object and request json object into one json object to pass to USGS api
    const request_body =  USGS_HELPER.mergejson(request_json,apiKey_json);

    //make call to USGS api
    const usgs_response = USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body);

    // usgs response
    usgs_response
      .then( data => {
        console.log(JSON.stringify(data));
      })
      //catch http errors not return errors in response
      .catch( error => {
        return USGS_HELPER.throw_error(error);;
      });


})
.catch( error => {
  return USGS_HELPER.throw_error(error);;
});
