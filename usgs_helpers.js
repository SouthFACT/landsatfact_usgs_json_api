module.exports = {


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
      throw_error(response.data.error);
      return response.data.error;
    } else {
      throw_error('error not able determine :(');
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

};
