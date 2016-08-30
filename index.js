var axios = require('axios');
var http = require('http');
var yaml = require('yamljs');
var USGS_CONSTANT = require("./usgs_constants.js");
var USGS_FUNCTION = require("./usgs_functions.js");
var USGS_HELPERS = require("./usgs_helpers.js");


//objects
const CONFIG_YAML = yaml.load("./config.yaml");

console.log(USGS_FUNCTION.usgsapi_clearorder('1','2','3'));

//function to login and get apiKey will need to use .then to access
//  which is how promises are resolved.
var get_api_key = function(){

  const username = CONFIG_YAML.username
  const password = CONFIG_YAML.password

  var login_data = USGS_HELPERS.makeLoginData(username,password);


  // var request_body = usgsapi_login(username,password);
  // var usgs_response = get_usgsapi_response(USGS_REQUEST_CODE_SUBMITBULKDOWNLOADORDER, request_body);


  var request_body_login = USGS_HELPERS.create_PostBody(login_data);

  //get request_code calling it action may change to make consistent with USGS api
  var request_action = USGS_HELPERS.create_url_action(USGS_REQUEST_CODE_LOGIN);

  //post for login
  return axios.post(request_action , request_body_login, USGS_CONSTANT.REQUEST_POST_HEADERS)
    .then(function (response) {

      var response_data = USGS_HELPERS.get_response_data(response);

      //check if data is null this usually means there is some kind
      // of error in the returned from USGS JSON API
      if (response_data == null){
        var error = USGS_HELPERS.get_response_error(response);
        return USGS_HELPERS.throw_error(error);
      }
      return response_data;
    })
    .catch(function (error) {
      console.log(error);
      return  USGS_HELPERS.throw_error(error);;
    });

};


// Landsat 8
const LANDSAT_8 = "LANDSAT_8";
//when Landsat 7 newer
const LANDSAT_ETM_SLC_OFF = "LANDSAT_ETM_SLC_OFF";
//when Landsat 7 older
const LANDSAT_ETM = "LANDSAT_ETM";
//when Landsat 5
const LANDSAT_TM = "LANDSAT_TM";

const PRODUCTS = ["STANDARD"];

const GRIDTYPE_WRS1 = "WRS1";
const GRIDTYPE_WRS2 = "WRS2";
const RESPONSEHAPE_POINT = 'POINT';
const RESPONSEHAPE_POLYGON = 'POLYGON';

const OUTPUT_MEDIA_DWNLD = "DWNLD";

//USGS request codes constants
const USGS_REQUEST_CODE_CLEARBULKDOWNLOADORDER = 'clearbulkdownloadorder';
const USGS_REQUEST_CODE_CLEARORDER = 'clearorder';
const USGS_REQUEST_CODE_DATASETFIELDS = 'datasetfields';
const USGS_REQUEST_CODE_DATASETS = 'datasets';
const USGS_REQUEST_CODE_DOWNLOAD = 'download';
const USGS_REQUEST_CODE_DOWNLOADOPTIONS = 'downloadoptions';
const USGS_REQUEST_CODE_GETBULKDOWNLOADPRODUCTS = 'getbulkdownloadproducts';
const USGS_REQUEST_CODE_GETORDERPRODUCTS = 'getorderproducts';
const USGS_REQUEST_CODE_GRID2LL = 'grid2ll';
const USGS_REQUEST_CODE_ITEMBASKET = 'itembasket';
const USGS_REQUEST_CODE_LOGIN = 'login';
const USGS_REQUEST_CODE_LOGOUT = 'logout';
const USGS_REQUEST_CODE_REMOVEBULKDOWNLOADSCENE = 'removebulkdownloadscene';
const USGS_REQUEST_CODE_REMOVEORDERSCENE = 'removeorderscene';
const USGS_REQUEST_CODE_METADATA = 'metadata';
const USGS_REQUEST_CODE_SEARCH = 'search';
const USGS_REQUEST_CODE_HITS = 'hits';
const USGS_REQUEST_CODE_STATUS = 'status';
const USGS_REQUEST_CODE_SUBMITBULKDOWNLOADORDER = 'submitbulkdownloadorder';
const USGS_REQUEST_CODE_SUBMITORDER = 'submitorder';
const USGS_REQUEST_CODE_UPDATEBULKDOWNLOADSCENE = 'updatebulkdownloadscene';
const USGS_REQUEST_CODE_UPDATEORDERSCENE = 'updateorderscene';

//set base URL for axios
axios.defaults.baseURL = USGS_CONSTANT.USGS_URL;

//login and get promise  for api key
var api_key = get_api_key();

//generic axio request function using HTTP get
var get_usgsapi_response = function(action, body){
  var request_action =  USGS_HELPERS.create_url_action(action);
  var request_body =  USGS_HELPERS.create_PostBody(body);

  return axios.post(request_action , request_body, USGS_CONSTANT.REQUEST_POST_HEADERS)
    //get response from USGS website and return the api key in this case.
    .then(  response =>  {
      //USGS formate is in data object so its in response.data.data

      var response_data =  USGS_HELPERS.get_response_data(response);

      //check of data is null this usually means there is some kind
      // of error in the returned from USGS JSON API
      if (response_data == null){
        var error =  USGS_HELPERS.get_response_error(response);
        return  USGS_HELPERS.throw_error(error);
      }

      return response_data;

    })
    //catch errors
    .catch( error => {
      console.log(error);
      return  USGS_HELPERS.throw_error(error);;
    });
}


//build a lib of all the json calls from jsonapi.
// throw errors on response data. some errors are in the response not in request http.
//everthing we want to do should be a function then call to do it.

//separte script that does a call like get metadata


api_key.then( data => {console.log(data)})

//place holders this will passed in as arguments
const lowerLeft = {
  "latitude": 44.60847,
  "longitude": -99.69639
};

const upperRight = {
  "latitude": 44.60847,
  "longitude": -99.69639
};
const startDate = "2014-10-01";
const endDate = "2014-10-01";

const entityIds =  ["LC80130292014100LGN00"] //["LC80130292014100LGN00","LC80130282014100LGN00"]; //["LC80130292014100LGN00"];
const products = ["STANDARD"];

const search_datasetName = "GLS2005";
const search_lowerLeft = {"latitude": 75,"longitude": -135};

const search_upperRight = {"latitude": 90,"longitude": -120};

const search_startDate= "2003-01-01";
const search_endDate = "2016-12-01";

const search_maxResults = 3;
const search_startingNumber = 1;
const search_sortOrder = "ASC";

//place holders this will passed in as arguments


///download optionts
//if promised resolved do task
api_key
  .then( (data) => {

    // const apiKey = data;
    // const node = NODE_EE;
    // const datasetName = LANDSAT_TM;
    // const machineOnly = true;
    // const path = 1;
    // const row = 1;
    // const seconde_node;
    // const maxResults = 10;
    // const months;
    // const includeUnknownCloudCover = true;
    // const minCloudCover;
    // const maxCloudCover;
    // const additionalCriteria;
    // const orderingId = "LC80130292014100LGN00"
    // const downloadCodes = ["STANDARD"]
    //
    // //
    // // var request_body = usgsapi_search (search_datasetName, search_lowerLeft, search_upperRight, search_startDate, search_endDate,
    // //                                     months, includeUnknownCloudCover, minCloudCover,maxCloudCover,
    // //                                     additionalCriteria, maxResults,
    // //                                     search_startingNumber, search_sortOrder, apiKey, node);
    // //
    // // var request_body = usgsapi_hits(datasetName, search_lowerLeft, search_upperRight, search_startDate, search_endDate,
    // //                                     months, includeUnknownCloudCover, minCloudCover,maxCloudCover,
    // //                                     additionalCriteria, apiKey, node);
    //
    //
    //   orderingId = "LT50980761990085ASA00"
    // 	productCode =  "T273"
    // 	option =  "None"
    // 	outputMedia =  OUTPUT_MEDIA_DWNLD

  //
  //     var request_body = usgsapi_updateorderscene (datasetName, productCode, outputMedia, option, orderingId, apiKey, node);
  //
  //     console.log(JSON.stringify(request_body))
  //     //usgsapi_metadata (apiKey, datasetName, node, entityIds);
  //     var usgs_response = get_usgsapi_response(USGS_REQUEST_CODE_SUBMITBULKDOWNLOADORDER, request_body);
  //     usgs_response.then( data => {console.log(JSON.stringify(data));
  //
  //
  //   })
  // //catch http errors not return errors in response
  // .catch( error => {
  //   console.log(error);
  //   return throw_error(error);;
  // });
  //
  // request_body = usgsapi_logout(apiKey);
  // var usgs_response = get_usgsapi_response(USGS_REQUEST_CODE_LOGOUT, request_body);
  // usgs_response.then( data => {console.log(JSON.stringify("logout: " + data));})


})
.catch( error => {
  console.log(error);
});




//if promised resolved do task
//Dataset Search
// api_key
//   .then( (data) => {
//     const apiKey = data;
//     const node = NODE_EE;
//     const datasetName = LANDSAT_8;
//     var request_body = usgsapi_datasets(datasetName, lowerLeft, upperRight, startDate, endDate, apiKey, node);
//     var usgs_response = get_usgsapi_response(USGS_REQUEST_CODE_DATASETS, request_body);
//     usgs_response.then( data => {console.log(data);
//   })
//   //catch http errors not return errors in response
//   .catch( error => {
//     console.log(error);
//     return throw_error(error);;
//   });
// });


// ///download scene
// //if promised resolved do task
// api_key
//   .then( (data) => {
//     const apiKey = data;
//     const node = NODE_EE;
//     const datasetName = LANDSAT_8;
//     var request_body = usgsapi_download(datasetName, products, entityIds, apiKey, node);
//     var usgs_response = get_usgsapi_response(USGS_REQUEST_CODE_DOWNLOAD, request_body);
//     usgs_response.then( data => {console.log(data);
//   })
//   //catch http errors not return errors in response
//   .catch( error => {
//     console.log(error);
//     return throw_error(error);;
//   });
// });
