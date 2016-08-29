var axios = require('axios');
var http = require('http');
var yaml = require('yamljs');
var usgs_constant = require("./usgs_constants.js");
var usgs_function = require("./usgs_functions.js");


//objects
const CONFIG_YAML = yaml.load("./config.yaml");



// Login
// Method Description
// This method requires SSL be used due to the sensitive nature of users passwords.
//
// Upon a successful login, an API key will be returned.
// This key will be active for one hour and should be destroyed upon final use of the service by calling the logout method.
// Users must have "Machine to Machine" access, which is established in the
var  usgsapi_login = function(username, password, authType){
  //   {
  //     "username": "username",
  //     "password": "password",
  //     "authType": "EROS"
  // }

  //all arguments need to be passed but can be passed undefined when optional these are the optional arguments
  authType = typeof authType !== 'undefined'  ? datasetName : "EROS";

  return {
    username,
    password,
    authType
  }
};
//Clear Bulk Download Order
//This method is used to clear any pending bulk download orders from the item basket.
// Sample Response
// This request does not have a response. Successful execution is assumed if no errors are thrown.

//Request Parameters
// datasetName
    // data type: string
    // default value:
    // required: No
    // usage: Identifies the dataset
    // Note: Use the datasetName from datasets response
    // api version: 1.0
// apiKey
    // data type: string
    // default value:
    // required: Yes
    // usage: Users API Key/Authentication Token
    // Note: Obtained from login request
    // api version: 1.0
// node
    // data type: string
    // default value:EE
    // required: Yes
    // usage: Determines the dataset catalog to use
    // Note:
    // api version: 1.0
var usgsapi_clearbulkdownloadorder = function(apiKey, node, datasetName){

  //all arguments need to be passed but can be passed undefined when optional these are the optional arguments
  datasetName = typeof datasetName !== 'undefined'  ? datasetName : null;

  return {
    apiKey,
    node,
    datasetName
  }
};

// Clear Order
// Method Description
// This method is used to clear any pending orders from the item basket.
//This request does not clear bulk download orders, to clear bulk download orders use clearBulkDownloadOrder.

//Request Parameters
// datasetName
    // data type: string
    // default value:
    // required: No
    // usage: Identifies the dataset
    // Note: Use the datasetName from datasets response
    // api version: 1.0
// apiKey
    // data type: string
    // default value:
    // required: Yes
    // usage: Users API Key/Authentication Token
    // Note: Obtained from login request
    // api version: 1.0
// node
    // data type: string
    // default value:EE
    // required: Yes
    // usage: Determines the dataset catalog to use
    // Note:
    // api version: 1.0
var usgsapi_clearorder = function(apiKey, node, datasetName){

  //all arguments need to be passed but can be passed undefined when optional these are the optional arguments
  datasetName = typeof datasetName !== 'undefined'  ? datasetName : null;

  return {
    apiKey,
    node,
    datasetName
  }
};

// Dataset Fields
// Method Description
// This request is used to return the metadata filter fields for the specified dataset.
// These values can be used as additional criteria when submitting search and hit queries.
var usgsapi_datasetfields = function(apiKey, node, datasetName){
  datasetName = typeof datasetName !== 'undefined'  ? datasetName : null;

  return {
    apiKey,
    node,
    datasetName
  }
};

// Dataset Search
// Method Description
// This method is used to find datasets available for searching. By passing no parameters except node,
// all available datasets are returned. Additional parameters such as temporal range and
// spatial bounding box can be used to find datasets that provide more specific data.
// The dataset name parameter can be used to limit the results based on matching the
// supplied value against the public dataset name with assumed wildcards at the beginning and end.
var usgsapi_datasets = function(apiKey, node, datasetName, lowerLeft, upperRight, startDate, endDate){
  datasetName = typeof datasetName !== 'undefined'  ? datasetName : null;
  lowerLeft = typeof lowerLeft !== 'undefined'  ? lowerLeft : {};
  upperRight = typeof upperRight !== 'undefined' ? upperRight : {};
  startDate = typeof startDate !== 'undefined' ? startDate : '1920-01-01';
  endDate = typeof endDate !== 'undefined' ? endDate : '2016-08-30';
  // example request
  // {
  // 	"datasetName": "L8",
  // 	"lowerLeft": {
  // 		"latitude": 44.60847,
  // 		"longitude": -99.69639
  // 	},
  // 	"upperRight": {
  // 		"latitude": 44.60847,
  // 		"longitude": -99.69639
  // 	},
  // 	"startDate": "2014-10-01",
  // 	"endDate": "2014-10-01",
  // 	"apiKey": "USERS API KEY",
  // 	"node": "EE"
  // }

  return {
  	datasetName,
  	lowerLeft,
  	upperRight,
  	startDate,
  	endDate,
  	apiKey,
  	node
  }
};

// Download
// Method Description
// The download request is used to generate a list of direct download URL's for data.
// To get available products, submit a downloadOptions request.
// All unavailable or invalid products are automatically excluded from the response.
//
// This request implements a rate limit on unattempted downloads.
// Download authorization records are created as a result of this request with the intent that the user will
// download the data before submitting subsequent requests.
// The rate limit is defined by 10 unattampted downloads within the last 10 minutes.
var usgsapi_download = function(datasetName, products, entityIds, apiKey, node){
  //example request
  // {
  // 	"datasetName": "LANDSAT_8",
  // 	"apiKey": "USERS API KEY",
  // 	"node": "EE",
  // 	"entityIds": ["LC80130292014100LGN00"],
  // 	"products": ["STANDARD"]
  // }
  return {
  	datasetName,
  	products,
  	entityIds,
  	apiKey,
  	node
  }
};

// Download Options
// Method Description
// The download options request is used to discover downloadable products for each dataset.
// If a download is marked as not available, an order must be placed to generate that product.
var usgsapi_downloadoptions = function(datasetName, apiKey, node, machineOnly, entityIds){
  machineOnly = typeof machineOnly !== 'undefined' ? machineOnly : true;

  //example request
  // {
  // 	"datasetName": "LANDSAT_8",
  // 	"apiKey": "USERS API KEY",
  // 	"node": "EE",
  //  machineOnly: true
  // 	"entityIds": ["LC80130292014100LGN00"]
  // }
  return {
  	datasetName,
  	apiKey,
  	node,
  	machineOnly,
  	entityIds
  }
};

// Get Bulk Download Products
// Method Description
// The use of this request is to retrieve bulk download products on a scene-by-scene basis.
var usgsapi_getbulkdownloadproducts = function(datasetName, apiKey, node, entityIds){
  // {
  // 	"datasetName": "LANDSAT_8",
  // 	"apiKey": "USERS API KEY",
  // 	"node": "EE",
  // 	"entityIds": ["LC80130292014100LGN00"]
  // }
  return {
  	datasetName,
  	apiKey,
  	node,
  	entityIds
  }
};

// Get Order Products
// Method Description
// The use of this request is to retrieve orderable products on a scene-by-scene basis.
var usgsapi_getorderproducts = function(datasetName, apiKey, node, entityIds){
  // {
  // 	"datasetName": "LANDSAT_8",
  // 	"apiKey": "USERS API KEY",
  // 	"node": "EE",
  // 	"entityIds": ["LC80130292014100LGN00"]
  // }
  return {
  	datasetName,
  	apiKey,
  	node,
  	entityIds
  }
};


// Grid to Lat/Lng
// Method Description
// This method is used to convert the following grid systems to lat/lng center points or polygons:
//    WRS-1, WRS-2. To account for multiple grid systems there are required fields for all
// grids (see "Required Request Parameters") as well as grid-specific parameters.
var usgsapi_grid2ll = function(gridType, responseShape, path, row){
  // {
  //     "gridType": "WRS1",
  //     "responseShape": "polygon",
  //     "path": 1,
  //     "row": 1
  // }
  return {
  	gridType,
  	responseShape,
  	path,
  	row
  }
};



// Item Basket
// Method Description
// This method returns the current item basket for the current user.
var usgsapi_itembasket = function(apiKey){
  // {
  // 	"apiKey": "USERS API KEY"
  // }
  return {
  	apiKey
  }
};


// Logout
// Method Description
// This method requires SSL be used due to the sensitive nature of users passwords.
//
// This method is used to remove the users API key from being used in the future.
var usgsapi_logout = function(apiKey){
  // {
  // 	"apiKey": "USERS API KEY"
  // }
  return {
  	apiKey
  }
};

// Remove Bulk Download Scene
// Method Description
// The use of this request is to remove scenes, on a scene-by-scene basis from the bulk download order item basket.
var usgsapi_removebulkdownloadscene = function(apiKey, datasetName, node, entityIds){
  // {
  // 	"apiKey": "USERS API KEY",
  // 	"datasetName": "LANDSAT_8",
  // 	"node": "EE",
  // 	"entityIds": ["LC80130292014100LGN00","LC80130282014100LGN00"]
  // }
  return {
  	apiKey,
  	datasetName,
  	node,
  	entityIds
  }
};



// Remove Order Scene
// Method Description
// The use of this request is to remove scenes, on a scene-by-scene basis from the order item basket.
var usgsapi_removeorderscene = function(apiKey, datasetName, node, entityIds){
  // {
  // 	"apiKey": "USERS API KEY",
  // 	"datasetName": "LANDSAT_8",
  // 	"node": "EE",
  // 	"entityIds": ["LC80130292014100LGN00","LC80130282014100LGN00"]
  // }
  return {
  	apiKey,
  	datasetName,
  	node,
  	entityIds
  }
};

// Scene Metadata
// Method Description
// The use of the metadata request is intended for those who have acquired scene IDs from a different source.
// It will return the same metadata that is available via the search request.
var usgsapi_metadata = function(apiKey, datasetName, node, entityIds){
  // {
  // 	"apiKey": "USERS API KEY",
  // 	"datasetName": "LANDSAT_8",
  // 	"node": "EE",
  // 	"entityIds": ["LC80130292014100LGN00"]
  // }
  return {
  	apiKey,
  	datasetName,
  	node,
  	entityIds
  }
};


// Scene Search
// Method Description
// Searching is done with limited search criteria. All coordinates are assumed decimal-degree format.
// If lowerLeft or upperRight are supplied, then both must exist in the request to complete the bounding box.
// Starting and ending dates, if supplied, are used as a range to search data based on acquisition dates.
// The current implementation will only search at the date level, discarding any time information.
// If data in a given dataset is composite data, or data acquired over multiple days,
// a search will be done to match any intersection of the acquisition range.
// There currently is a 50,000 scene limit for the number of results that are returned, however,
// some client applications may encounter timeouts for large result sets for some datasets.
//
// To use the additional criteria field, pass one of the four search filter objects
// (SearchFilterAnd, SearchFilterBetween, SearchFilterOr, SearchFilterValue) in JSON format
// with additionalCriteria being the root element of the object.
var usgsapi_search = function(datasetName, lowerLeft, upperRight , startDate, endDate,
                              months, includeUnknownCloudCover, minCloudCover,
                               maxCloudCover, additionalCriteria, maxResults, startingNumber,
                               sortOrder, apiKey, node){

  lowerLeft = typeof lowerLeft !== 'undefined'  ? lowerLeft : {};
  upperRight = typeof upperRight !== 'undefined' ? upperRight : {};
  startDate = typeof startDate !== 'undefined' ? startDate : '1920-01-01';
  endDate = typeof endDate !== 'undefined' ? endDate : '2016-08-30';
  months = typeof months !== 'undefined' ? months : null;
  includeUnknownCloudCover = typeof includeUnknownCloudCover !== 'undefined' ? includeUnknownCloudCover : true;
  minCloudCover = typeof minCloudCover !== 'undefined' ? minCloudCover : 0;
  maxCloudCover = typeof maxCloudCover !== 'undefined' ? maxCloudCover : 100;
  additionalCriteria = typeof additionalCriteria !== 'undefined' ? additionalCriteria : null;
  maxResults = typeof maxResults !== 'undefined' ? maxResults : 10;
  startingNumber = typeof startingNumber !== 'undefined' ? startingNumber : 1;
  sortOrder = typeof sortOrder !== 'undefined' ? sortOrder : 'ASC';
  node = typeof node !== 'undefined' ? node : 'EE';


  // limited example {
  // 	"datasetName": "GLS2005",
  // 	"lowerLeft": {
  // 		"latitude": 75,
  // 		"longitude": -135
  // 	},
  // 	"upperRight": {
  // 		"latitude": 90,
  // 		"longitude": -120
  // 	},
  // 	"startDate": "2006-01-01",
  // 	"endDate": "2007-12-01",
  // 	"node": "EE",
  // 	"maxResults": 3,
  // 	"startingNumber": 1,
  // 	"sortOrder": "ASC",
  // 	"apiKey": "USERS API KEY"
  // }



  return {
    datasetName,
  	lowerLeft,
  	upperRight,
  	startDate,
  	endDate,
    months,
    includeUnknownCloudCover,
    minCloudCover,
    maxCloudCover,
    additionalCriteria,
    maxResults,
    startingNumber,
    sortOrder,
  	apiKey,
    node,
  }
};



// Scene Search Hits
// Method Description
// This method is used in determining the number of hits a search returns. Because a hits request requires a search,
// this request takes the same parameters as the search request, with exception to the non-search-field parameters; maxResults,
// startingNumber, and sortOrder.

//Request Parameters
// datasetName
  // data type: string
  // default value:
  // required: Yes
  // usage: Identifies the dataset
  // Note: Use the datasetName from datasets response
  // api version: 1.0
// lowerLeft
  // data type: Service_Class_Coordinate
  // default value: No Bounds (if omitted from request)
  // required: No
  // usage: When used in conjunction with upperRight, creates a bounding box to search spatially.
  // Note: Coordinates are assumed in decimal degrees in EPSG:4326 projection
  // api version: 1.0
// upperRight
  // data type: ervice_Class_Coordinate
  // default value: No Bounds(if omitted from request)
  // required: No
  // usage: When used in conjunction with lowerLeft, creates a bounding box to search spatially.
  // Note: Coordinates are assumed in decimal degrees in EPSG:4326 projection
  // api version: 1.0
// startDate
  // data type: string
  // default value: 1920-01-01
  // required: No
  // usage: Used to search the dataset temporally to discover scenes
  // Note: ISO 8601 Formatted Date Time portion is ignored
  // api version: 1.0
// endDate
  // data type: string
  // default value: 2016-08-30
  // required: No
  // usage: Used to search the dataset temporally to discover scenes
  // Note: ISO 8601 Formatted Date Time portion is ignored
  // api version: 1.0
// months
  // data type: int[]
  // default value: All Months
  // required: No
  // usage: Used to limit results to specific months
  // Note: Valid values are [1,12]
  // api version: 1.0
// includeUnknownCloudCover
  // data type: boolean
  // default value: true
  // required: No
  // usage: Used to determine if scenes with unknown cloud cover values should be included in the results
  // Note:
  // api version: 1.1
// minCloudCover
  // data type: int
  // default value: 0
  // required: No
  // usage: Used to limit results by minimum cloud cover (for supported datasets)
  // Note: Valid values are [0, 100]
  // api version: 1.1
// maxCloudCover
  // data type: int
  // default value: 100
  // required: No
  // usage: Used to limit results by maximum cloud cover (for supported datasets)
  // Note: Valid values are [0, 100]
  // api version: 1.1
// additionalCriteria
  // data type: Service_Inventory_SearchFilter
  // default value: No Criteria (if omitted from request)
  // required: No
  // usage: Used to filter results based on dataset specific metadata fields
  // Note: Use datasetFields request to determine available fields and options
  // api version: 1.0
// maxResults
  // data type: integer
  // default value: 10
  // required: No
  // usage: Used to determine the number of results to return
  // Note: Use with startingNumber for controlled pagination  Maximum	list size - 50,000
  // api version: 1.0
// startingNumber
  // data type: integer
  // default value: 1
  // required: No
  // usage: Used to determine the result number to start returning from
  // Note: Use with maxResults for controlled pagination
  // api version: 1.0
// sortOrder
  // data type: string
  // default value: ASC
  // required: No
  // usage: Used to order results based on acquisition date
  // Note:
  // api version: 1.0
// apiKey
  // data type: string
  // default value:
  // required: Yes
  // usage: Users API Key/Authentication Token
  // Note: Obtained from login request
  // api version: 1.0
// node
  // data type: string
  // default value: EE
  // required: Yes
  // usage: Determines the dataset catalog to use
  // Note:
  // api version: 1.0
var usgsapi_hits = function(datasetName, lowerLeft, upperRight , startDate, endDate,
                              months, includeUnknownCloudCover, minCloudCover,
                               maxCloudCover, additionalCriteria, apiKey, node){


    lowerLeft = typeof lowerLeft !== 'undefined'  ? lowerLeft : {};
    upperRight = typeof upperRight !== 'undefined' ? upperRight : {};
    startDate = typeof startDate !== 'undefined' ? startDate : '1920-01-01';
    endDate = typeof endDate !== 'undefined' ? endDate : '2016-08-30';
    months = typeof months !== 'undefined' ? months : null;
    includeUnknownCloudCover = typeof includeUnknownCloudCover !== 'undefined' ? includeUnknownCloudCover : true;
    minCloudCover = typeof minCloudCover !== 'undefined' ? minCloudCover : 0;
    maxCloudCover = typeof maxCloudCover !== 'undefined' ? maxCloudCover : 100;
    additionalCriteria = typeof additionalCriteria !== 'undefined' ? additionalCriteria : null;
    node = typeof node !== 'undefined' ? node : 'EE';

    return {
      datasetName,
    	lowerLeft,
    	upperRight,
    	startDate,
    	endDate,
      months,
      includeUnknownCloudCover,
      minCloudCover,
      maxCloudCover,
      additionalCriteria,
    	apiKey,
      node,
    }
}

// Status
// Method Description
// This method is used to get the status of the API. There are no parameters available to call this method with.
var usgsapi_status = function(apiKey){
  // {
  // 	"apiKey": "USERS API KEY",
  // 	"node": "EE"
  // }
  return {
  	apiKey
  }
};



// Submit Bulk Download Order
// Method Description
// This method is used to submit the current bulk download order in the item basket and returns the order id (order number)
// for the submitted order.
var usgsapi_submitbulkdownloadorder = function(apiKey, node){
  // {
  // 	"apiKey": "USERS API KEY",
  // 	"node": "EE"
  // }
  return {
  	apiKey,
  	node
  }
};


// Submit Order
// Method Description
// This method is used to submit the current order in the item basket and returns the order number for the submitted order.
var usgsapi_submitorder = function(apiKey, node){
  // {
  // 	"apiKey": "USERS API KEY",
  // 	"node": "EE"
  // }
  return {
  	apiKey,
  	node
  }
};


// Update Bulk Download Scene
// Method Description
// This method is used to update the currently-selected products for a scene in the bulk download item basket.
// The information needed for this request is obtained from the response of the getBulkDownloadProducts request.
var usgsapi_updatebulkdownloadscene = function(datasetName, downloadCodes	, orderingId, apiKey, node){
  // {
  // 	"apiKey": "USERS API KEY",
  // 	"node": "EE",
  // 	"datasetName": "LANDSAT_8",
  // 	"orderingId": "LC80130292014100LGN00",
  // 	"downloadCodes": ["STANDARD"]
  // }
  return {
    datasetName,
    downloadCodes,
    orderingId,
    apiKey,
    node
  }
};

// Update Order Scene
// Method Description
// This method is used to update the currently-selected products for a scene in the order item basket.
// The information needed for this request is obtained from the response of the getOrderProducts request.
//
// Please note that datasets may have individual ordering limits and that no order may exceed 1,000 scenes.
var usgsapi_updateorderscene = function(datasetName, productCode, outputMedia, option, orderingId, apiKey, node){
  // {
  // 	"apiKey": "USERS API KEY",
  // 	"node": "EE",
  // 	"datasetName": "LANDSAT_TM",
  // 	"orderingId": "LT50980761990085ASA00",
  // 	"productCode": "T273",
  // 	"option": "None",
  // 	"outputMedia": "DWNLD"
  // }
  return {
    datasetName,
    productCode,
    outputMedia,
    option,
    orderingId,
    apiKey,
    node
  }
};

var create_PostBody = function(data){
   const USGS_JSON_REQUEST = 'jsonRequest=';
   return USGS_JSON_REQUEST + JSON.stringify(data);
};

//function to create the url action the correct URL structure for the JSON API is:
// Formulating the Request URL
// Each request follows a standard URL format.
//
// <http_service_endpoint>/json/<request_code>?jsonRequest=<json_request_content>
//the <request_code> is the action
var create_url_action = function(action){
   return '/' + action;
};

//function to get the JSON response data.
//  the response is in .data but errors are in .error.
// use this function to get data.
var get_response_data = function(response){
  if (response.data.data != null){
    return response.data.data
  }
};

//function to get the JSON response error
// Errors
// Errors within this API are typically returned in the returned JSON object.
// However, be sure to inspect the HTTP status code on each request, as some errors may not be caught by the service endpoint.
// Error codes can be found on the error code page. The error response field may provide additional details about an error.
var get_response_error = function(response){
  if (response.data.error != null){
    throw_error(response.data.error);
    return response.data.error;
  } else {
    throw_error('error not able determine :(');
    return 'error not able determine :(';
  }
};

//throw error with custom message
var throw_error = function(error_message){
  //create error
  const error = new Error(error_message);
  throw error;
};



var makeLoginData = function(username,password){
  return {
    username,
    password,
  }
}
//function to login and get apiKey will need to use .then to access
//  which is how promises are resolved.
var get_api_key = function(){

  const username = CONFIG_YAML.username
  const password = CONFIG_YAML.password

  var login_data = makeLoginData(username,password);


  // var request_body = usgsapi_login(username,password);
  // var usgs_response = get_usgsapi_response(USGS_REQUEST_CODE_SUBMITBULKDOWNLOADORDER, request_body);


  var request_body_login = create_PostBody(login_data);

  //get request_code calling it action may change to make consistent with USGS api
  var request_action = create_url_action(USGS_REQUEST_CODE_LOGIN);

  //post for login
  return axios.post(request_action , request_body_login, usgs_constant.REQUEST_POST_HEADERS)
    .then(function (response) {

      var response_data = get_response_data(response);

      //check if data is null this usually means there is some kind
      // of error in the returned from USGS JSON API
      if (response_data == null){
        var error = get_response_error(response);
        return throw_error(error);
      }
      return response_data;
    })
    .catch(function (error) {
      console.log(error);
      return throw_error(error);;
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
axios.defaults.baseURL = usgs_constant.USGS_URL;

//login and get promise  for api key
var api_key = get_api_key();

//generic axio request function using HTTP get
var get_usgsapi_response = function(action, body){
  var request_action = create_url_action(action);
  var request_body = create_PostBody(body);

  return axios.post(request_action , request_body, usgs_constant.REQUEST_POST_HEADERS)
    //get response from USGS website and return the api key in this case.
    .then(  response =>  {
      //USGS formate is in data object so its in response.data.data

      var response_data = get_response_data(response);

      //check of data is null this usually means there is some kind
      // of error in the returned from USGS JSON API
      if (response_data == null){
        var error = get_response_error(response);
        return throw_error(error);
      }

      return response_data;

    })
    //catch errors
    .catch( error => {
      console.log(error);
      return throw_error(error);;
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
