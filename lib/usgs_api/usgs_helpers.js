var axios = require('axios')
var http = require('http')
var yaml = require('yamljs')
var Promise = require('bluebird')
Promise.longStackTraces()

//modules
var USGS_CONSTANT = require("./usgs_constants.js")
var USGS_FUNCTION = require("./usgs_functions.js")
var mock_usgs_api_call = require('../../test/mock_usgs_api_call.js')
const MAX_LOGIN_ATTEMPTS = 5
const MAX_REQUEST_ATTEMPTS = 5

// Settings for USGS
const USGS_CONFIG = process.env.NODE_ENV === 'test' ?
  {
    username: process.env.USGS_API_USERNAME,
    password: process.env.USGS_API_PASSWORD,
    download_directory: process.env.USGS_DOWNLOAD_DIR
  }
 : yaml.load('./lib/usgs_api/config.yaml')

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
        return  "LANDSAT_8"
        break
      case (proudctAbbrevation === "LE7") && (slc_off): //LANDSAT 7 with slc off
        return "LANDSAT_ETM_SLC_OFF"
        break
      case (proudctAbbrevation === "LE7") && (!slc_off): //LANDSAT 7 with slc on
        return "LANDSAT_ETM"
        break
      case (proudctAbbrevation === "LT5"): //LANDSAT 5
        return "LANDSAT_TM"
        break
      case (proudctAbbrevation === "LT4"): //LANDSAT 4
        return "LANDSAT_TM"
        break
      default:
        return "LANDSAT_8"
        break
    }

  },


  /**
   * Sort scene records by which dataset they belong to.
   * 
   * @param records is a list of records (scenes) from the metadata table.
   * In other words, the 'rows' field of the result of a select query.
   *
   * @return an object: keys are dataset names, values are lists of scene ids.
   *
   */
  sort_scene_records_by_dataset: function(records) {
    if (records && records.length) {
      var _this = this
      var scenes_by_dataset = { }
      USGS_CONSTANT.LANDSAT_DATASETS.map(function (dataset_name) {
        scenes_by_dataset[dataset_name] = []
      })
      records.forEach(function(row) {
        const row_dataset = _this.get_datasetName(row.scene_id, row.acquisition_date)
        scenes_by_dataset[row_dataset].push(row.scene_id)
      })
      return scenes_by_dataset
    }
    else {
      this.throw_error('No records supplied to sort by dataset')
    }
  },

  /**
   * Process scenes for each landsat dataset. Run a callback for each group of scenes.
   * When a callback finishes, put the result of the callback in place of the list of scenes
   * just processed. When every dataset is processed, return all callback results.
   *
   * @param dataset_names is a list of landsat dataset names
   * @param scenes_by_dataset is the output of sort_scene_records_by_dataset
   *
   * @param callback is a function to call for each group of scenes.
   *    @param dataset_name is the name of the dataset
   *           to which the current batch of scenes belong
   *    @param dataset_scenes is a list of scene objects from the metadata table.
   *    ...
   *    @param user parameters (cb_params) are placed after the previous two parameters
   *    
   *
   * @param cb_params is a list of additional arguments for the callback function.
   *
   * @return an object where fields are dataset names and the values
   *    are the return values of the invoked callbacks for each dataset.
   * 
   */
  process_scenes_by_dataset: function (dataset_names, scenes_by_dataset, callback, cb_params) {
    var _this = this
    const dataset_name = dataset_names.pop()
    const dataset_scenes = scenes_by_dataset[dataset_name]
    cb_params = cb_params || []
    cb_params.splice(0, 0, dataset_name, dataset_scenes)
    return Promise.resolve().then(function () {
      if (typeof(callback) === 'function' && dataset_scenes.length) {
        return callback.apply(null, cb_params)
      }
    }).then(function (cb_result) {
      scenes_by_dataset[dataset_name] = cb_result
      if (dataset_names.length) {
        return _this.process_scenes_by_dataset(dataset_names, scenes_by_dataset, callback, cb_params)
      }
      return scenes_by_dataset
    })
  },

  //get the product abbrevation from the scene_id
  //  this will help do things like determine the datasetName for sending requests
  //  to the USGS api
  get_product_abbrevation: function(scene_id){
    return scene_id.substring(0, 3)
    //get product abbrevation. This identifes the imager product
  },

  //decide if slc is off or on for landsat 7 imagery
  check_slc: function(acquisition_date){

    //needs to be a date type for comparison
    const image_acquisition_date = new Date(acquisition_date)

    return (USGS_CONSTANT.SLC_ONFF_DATE < image_acquisition_date)
  },

  //function to login and get apiKey will need to use .then to access
  //  which is how promises are resolved.
  get_api_key: function(num_attempts) {

    num_attempts = num_attempts || 1

    //get the user name and password from config file
    //config yaml should always be in format
    // username: usgs user name
    // password: usgs password
    //and shold be in a file named config.yaml
    const username = USGS_CONFIG.username
    const password = USGS_CONFIG.password

    console.log(username, password)

    //create the login data JSON data from the response
    var login_data = this.makeLoginData(username,password)

    const USGS_REQUEST_CODE_LOGIN = this.get_usgs_response_code('login')

    //declare _this so it's available
    var _this = this

    //HTTP post for login
    return this.get_usgsapi_response(USGS_REQUEST_CODE_LOGIN, login_data)

  },

  //generic axio request function using HTTP get
  get_usgsapi_response: function(action, body, num_attempts) {

    num_attempts = num_attempts || 1

    var request_action =  this.create_url_action(action)
    var request_body =  this.create_PostBody(body)

    //declare _this so it's available
    var _this = this

    if (process.env.NODE_ENV === 'test') {
      return mock_usgs_api_call(action, body)
    }
    
    return axios.post(request_action, request_body, USGS_CONSTANT.REQUEST_POST_HEADERS)
      //get response from USGS website and return the api key in this case.
      .then( response =>  {

        //USGS format is in data object so its in response.data.data
        var response_data = _this.get_response_data(response)

        //check of data is null this usually means there is some kind
        // of error in the returned from USGS JSON API
        if (response_data === null || response.data.error) {
          _this.throw_error(this.get_response_error(response))
        }
        return response_data

      }).catch(function (error) {
        if (num_attempts < MAX_REQUEST_ATTEMPTS &&
            error.message.indexOf('Rate limit exceeded') >= 0) {
          return _this.get_usgsapi_response(action, body, ++num_attempts)
        } else {
          _this.throw_error(error.message)
        }
      })
  },


  //function to create the body of the http post.  for usgs this needs to be a key of jsonRequest in the
  //  URL string followed by JSON "string".  this function formats properly
  create_PostBody: function(data){
     const USGS_JSON_REQUEST = 'jsonRequest='
     return USGS_JSON_REQUEST + JSON.stringify(data)
  },



  //function to create the url action the correct URL structure for the JSON API is:
  // Formulating the Request URL
  // Each request follows a standard URL format.
  //
  // <http_service_endpoint>/json/<request_code>?jsonRequest=<json_request_content>
  //the <request_code> is the action
  create_url_action: function(action){
     return '/' + action
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
    if (response.data.error !== null){
      return 'Error in USGS response: ' + response.data.error
    } else {
      return 'Unknown error occurred.'
    }
  },

  //throw error with custom message
  throw_error: function(error_message) {
    //create error
    //const error = new Error(error_message)
    throw new Error(error_message)
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
                 ]

    if (valid_request_codes.indexOf(request_code) >= 0) {
       return request_code
    } else {
      this.throw_error('request ' + request_code + ' is not available or is an invalid request code.  Check the USGS JSON api documentation @ http://earthexplorer.usgs.gov/inventory/documentation.  Maybe the request code is a new call that has been added to the api but not updated here.')
    }
  },

  //merge json objects. would use spread but not availabe in node yet
  mergejson: function(a, b){
     for(var key in b)
         if(b.hasOwnProperty(key))
             a[key] = b[key]
     return a
  },

  //logout
  usgs_logout: function (apiKey){

    //get logout json request
    request_body = USGS_FUNCTION.usgsapi_logout(apiKey)

    //make sure this is a valid request code
    const request_code = 'logout'
    const USGS_REQUEST_CODE = this.get_usgs_response_code(request_code)
    //send logout request to usgs api
    return this.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
  }

}
