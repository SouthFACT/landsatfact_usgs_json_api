var axios = require('axios');
var http = require('http');
var yaml = require('yamljs');

//modules
var USGS_CONSTANT = require("./usgs_constants.js");
var USGS_FUNCTION = require("./usgs_functions.js");

//config data
const CONFIG_YAML = yaml.load("./lib/usgs_api/config.yaml");

module.exports = {


      get_datasetName: function(scene_id, acquisition_date){


        //check of slc of off in not assume on
        const slc_off = this.check_slc(acquisition_date)

        //get product abbrevation
        const proudctAbbrevation = this.get_product_abbrevation(scene_id)

        //get the product abbrevation so we can determine the USGS
        //  dataset name
        switch (true) {
          case (proudctAbbrevation === "LC8"): //LANDSAT 8
            return  "LANDSAT_8";
            break;
          case (proudctAbbrevation === "LE7") && (slc_off): //LANDSAT 7 with slc off
            return "LANDSAT_ETM_SLC_OFF";
            break;
          case (proudctAbbrevation === "LE7") && (!slc_off): //LANDSAT 7 with slc on
            return "LANDSAT_ETM";
            break;
          case (proudctAbbrevation === "LT5"): //LANDSAT 5
            return "LANDSAT_TM";
            break;
          default:
            return "LANDSAT_8";
            break;
        }

      },

    //get the product abbrevation from the scene_id
    //  this will help do things like determine the datasetName for sending requests
    //  to the USGS api
    get_product_abbrevation: function(scene_id){
      return scene_id.substring(0, 3);
      //get product abbrevation. This identifes the imager product
    },

    //decide if slc is off or on for landsat 7 imagery
    check_slc: function(acquisition_date){

      //needs to be a date type for comparison
      const image_acquisition_date = new Date(acquisition_date);

      return (USGS_CONSTANT.SLC_ONFF_DATE < image_acquisition_date);
    },

    //function to login and get apiKey will need to use .then to access
    //  which is how promises are resolved.
    get_api_key: function(){

      //get the user name and password from config file
      //config yaml should always be in format
      // username: usgs user name
      // password: usgs password
      //and shold be in a file named config.yaml
      const username = CONFIG_YAML.username
      const password = CONFIG_YAML.password

      //create the login data JSON data from the response
      var login_data = this.makeLoginData(username,password);

      //format the login data for the post
      var request_body_login = this.create_PostBody(login_data);

      const USGS_REQUEST_CODE_LOGIN = this.get_usgs_response_code('login' );

      //get request_code calling it action may change to make consistent with USGS api
      var request_action = this.create_url_action(USGS_REQUEST_CODE_LOGIN);

      //declare self so it's available
      var self = this;

      //HTTP post for login
      return axios.post(request_action , request_body_login, USGS_CONSTANT.REQUEST_POST_HEADERS)
        .then(function (response) {

          //get the response from USGS server at: USGS_URL
          var response_data = self.get_response_data(response);

          //check if data is null this usually means there is some kind
          // of error in the returned JSON from USGS's JSON API
          if (response_data == null){
            //check the json data for an error and extract it
            var error = self.get_response_error(response);
            //make this a application error so it errors out with error message from USGS
            return Promise.reject(error)
          }

          //if no errors return the api key
          return response_data;
        })

    },

    //generic axio request function using HTTP get
    get_usgsapi_response: function(action, body ){

      var request_action =  this.create_url_action(action);
      var request_body =  this.create_PostBody(body);

      //declare self so it's available
      var self = this;

      return axios.post(request_action , request_body, USGS_CONSTANT.REQUEST_POST_HEADERS)
        //get response from USGS website and return the api key in this case.
        .then(  response =>  {
          
          //USGS format is in data object so its in response.data.data
          var response_data =  self.get_response_data(response);

          //check of data is null this usually means there is some kind
          // of error in the returned from USGS JSON API
          if (response_data === null){
            var error =  self.get_response_error(response);
            return Promise.reject(error)
          }

          return response_data;
        })
    },


  //function to create the body of the http post.  for usgs this needs to be a key of jsonRequest in the
  //  URL string followed by JSON "string".  this function formats properly
  create_PostBody: function(data){
     const USGS_JSON_REQUEST = 'jsonRequest=';
     return USGS_JSON_REQUEST + JSON.stringify(data);
  },



  //function to create the url action the correct URL structure for the JSON API is:
  // Formulating the Request URL
  // Each request follows a standard URL format.
  //
  // <http_service_endpoint>/json/<request_code>?jsonRequest=<json_request_content>
  //the <request_code> is the action
  create_url_action: function(action){
     return '/' + action;
  },


  //function to get the JSON response data.
  //  the response is in .data but errors are in .error.
  // use this function to get data.
  get_response_data: function(response){
    if (response.data.data != null){
      return response.data.data
    }
  },


  //function to get the JSON response error
  // Errors
  // Errors within this API are typically returned in the returned JSON object.
  // However, be sure to inspect the HTTP status code on each request, as some errors may not be caught by the service endpoint.
  // Error codes can be found on the error code page. The error response field may provide additional details about an error.
  get_response_error: function(response){
    if (response.data.error != null){
      return response.data.error;
    } else {
      return 'Unknown error occurred.';
    }
  },

  //throw error with custom message
  throw_error: function(error_message){
    //create error
    const error = new Error(error_message);
    throw error;
  },

  //makes loging data json data from YAML config file
  makeLoginData: function(username,password){
    return {
      username,
      password,
    }
  },


  //must be one of these request codes
  get_usgs_response_code: function(request_code){
    valid_request_codes = ['clearbulkdownloadorder',
                   'clearorder',
                   'datasetfields',
                   'datasets',
                   'download',
                   'downloadoptions',
                   'getbulkdownloadproducts',
                   'getorderproducts',
                   'grid2ll',
                   'itembasket',
                   'login',
                   'logout',
                   'removebulkdownloadscene',
                   'removeorderscene',
                   'metadata',
                   'search',
                   'hits',
                   'submitbulkdownloadorder',
                   'submitorder',
                   'updatebulkdownloadscene',
                   'updateorderscene'
                 ];

    if (valid_request_codes.indexOf(request_code) >= 0) {
       return request_code;
    } else {
      this.throw_error('request ' + request_code + ' is not available or is an invalid request code.  Check the USGS JSON api documentation @ http://earthexplorer.usgs.gov/inventory/documentation.  Maybe the request code is a new call that has been added to the api but not updated here.');
    }
  },

  //merge json objects. would use spread but not availabe in node yet
  mergejson: function(a, b){
     for(var key in b)
         if(b.hasOwnProperty(key))
             a[key] = b[key];
     return a;
  },

  //logout
  usgs_logout: function (apiKey){

    //get logout json request
    request_body = USGS_FUNCTION.usgsapi_logout(apiKey);

    //make sure this is a valid request code
    const request_code = 'logout';
    const USGS_REQUEST_CODE = this.get_usgs_response_code(request_code);
    //send logout request to usgs api
    var usgs_response = this.get_usgsapi_response(USGS_REQUEST_CODE, request_body);
    return usgs_response
      .then( data => {

        //check of data is null this usually means there is some kind
        // of error in the returned from USGS JSON API
        if (response_data == null){
          var error =  self.get_response_error(response);
          return Promise.reject(error)
        }

        return data
      })
      //catch http errors
      .catch( error => {
        self.throw_error(error);
      });
  }

};
