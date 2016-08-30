# Examples of using this
* clone repository in GitHub
* npm install
* create a config.yaml file
  >if you change the name of this file to something other than config.yaml make sure you add it to .gitignore so it is not posted to GitHub.
* create a javascript file to interact with api



## config.yaml
a config yaml must be in the root directory of the project with this format:
```YAML
username: username
password: password
```

## add this to the top of your node javascript file
```javascript
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
```


## then do some kind of action
In this example we will login and get metadata for a scene
```javascript

//this is using promises so you need resolve the promise to get the key which is in the "data" object in this example.
s
//   all supported USGS functions defined in usgs_functions.js
api_key.then( data => {

  //gets the correct JSON body for the request
  //var request_body = USGS_FUNCTION.usgsapi_APIRequestCode(some arguments);

  //example for metadata
  const apiKey = data;
  const node = USGS_CONSTANT.NODE_EE;
  const datasetName = USGS_CONSTANT.LANDSAT_8;
  const entityIds =  ["LC80130292014100LGN00"];

  //get the request body to send to usgs api
  //   replace the usgsapi_metadata with the correct USGS request codes  in format usgsapi_requestcode all availabe are in the USGS_FUNCTIONs.js module check the api for required arguments
  var request_body = USGS_FUNCTION.usgsapi_metadata(apiKey, node, datasetName, entityIds);

  //ensure you have a valid request code for metadata if invalid will error out
  const request_code = 'metadata';
  const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code(request_code);

  //get the response from usgs this will also be a promise so you will have to deal with a promise to get data but the function will create an error when the response data has an error code from the USGS api.
  var usgs_response = USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body);



})
```
