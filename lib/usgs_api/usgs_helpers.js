var axios = require('axios');
var http = require('http');
var yaml = require('yamljs');

//modules
var USGS_CONSTANT = require("./usgs_constants.js");
var USGS_FUNCTION = require("./usgs_functions.js");

//config data
const CONFIG_YAML = yaml.load("./lib/usgs_api/config.yaml");

module.exports = {


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
            //make this a application error so it erros out with error message from USGS
            return self.throw_error(error);
          }

          //if no errors return the api key
          return response_data;
        })
        //HTTP error
        .catch(function (error) {
          return  self.throw_error(error);;
        });

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
      this.throw_error(response.data.error);
      return response.data.error;
    } else {
      this.throw_error('error not able determine :(');
      return 'error not able determine :(';
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



  //generic axio request function using HTTP get
  get_usgsapi_response: function(action, body ){

    var request_action =  this.create_url_action(action);
    var request_body =  this.create_PostBody(body);

    //declare self so it's available
    var self = this;

    return axios.post(request_action , request_body, USGS_CONSTANT.REQUEST_POST_HEADERS)
      //get response from USGS website and return the api key in this case.
      .then(  response =>  {
        //USGS formate is in data object so its in response.data.data

        var response_data =  self.get_response_data(response);

        //check of data is null this usually means there is some kind
        // of error in the returned from USGS JSON API
        if (response_data == null){
          var error =  self.get_response_error(response);
          // wait = false;
          return  self.throw_error(error);
        }

        // wait = false;
        return response_data;

      })
      //catch errors
      .catch( error => {
        wait = false;
        return  self.throw_error(error);;
      });
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
      return  this.throw_error('request ' + request_code + ' is not available or is an invalude request code.  Check the USGS JSON api documentation @ http://earthexplorer.usgs.gov/inventory/documentation.  Maybe the request code is a new call that has been added to the api but not updated here.');;
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
          return  self.throw_error(error);
        }

        return data
      })
      //catch http errors
      .catch( error => {
        return  self.throw_error(error);;
      });
  }

};
