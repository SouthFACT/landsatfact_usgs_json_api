var axios = require('axios');
var http = require('http');

//get modules
var USGS_CONSTANT = require("./usgs_constants.js");
var USGS_FUNCTION = require("./usgs_functions.js");
var USGS_HELPER = require("./usgs_helpers.js");

//set base URL for axios
axios.defaults.baseURL = USGS_CONSTANT.USGS_URL;

//login and get promise for api key
var api_key = USGS_HELPER.get_api_key();
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
    const apiKey = data;
    const node = USGS_CONSTANT.NODE_EE;
    const datasetName = USGS_CONSTANT.LANDSAT_8;

    //get usgs request code
    const request_code = 'metadata';
    const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code(request_code);

    var request_body = USGS_FUNCTION.usgsapi_metadata(apiKey, node, datasetName, entityIds);
    var usgs_response = USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body);

    // usgs response
    usgs_response
      .then( data => {
        console.log(data);
      })
      //catch http errors not return errors in response
      .catch( error => {
        return USGS_HELPER.throw_error(error);;
      });


})
.catch( error => {
  console.log(error);
});






//examples may need to adjust for changes in usgs_functions

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
