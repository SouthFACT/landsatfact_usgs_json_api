var axios = require('axios');
var http = require('http');
var yaml = require('yamljs');

//get modules
var USGS_CONSTANT = require("./usgs_constants.js");
var USGS_FUNCTION = require("./usgs_functions.js");
var USGS_HELPER = require("./usgs_helpers.js");

//set base URL for axios
axios.defaults.baseURL = USGS_CONSTANT.USGS_URL;

//config data must be in a file named metadata.yaml
const METADATA_YAML = yaml.load("./metadata.yaml");

//get the array of datasetnames for use in USGS API calls
const datasets = METADATA_YAML.metadata_datasets;
const metadata_from_days_ago = METADATA_YAML.metadata_from_days_ago;

//login and get promise for api key
var api_key = USGS_HELPER.get_api_key();

const node = USGS_CONSTANT.NODE_EE;
// const datasetNames = ["LANDSAT_8","LANDSAT_ETM_SLC_OFF"]
// const fieldNames = ["WRS Path","WRS Row"]
// const path = [13,33]
// const row = [33,43]

var additionalCriteria = "";
//captures lastpromise first one is resolved
var lastPromise = Promise.resolve();;

datasets.map( dataset => {
  // fieldNames.map (fieldName => {
  const datasetName = dataset.datasetName

    api_key
    .then( (apiKey) => {

      const node = USGS_CONSTANT.NODE_EE;

      //get the actaull filterid value from the request datasetfields
      const request_body = USGS_FUNCTION.usgsapi_datasetfields(apiKey, node, datasetName);
      const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('datasetfields');

      //make call to USGS api.  Make sure last promise is resolved first
      //  becuase USGS api is throttled for one request at a time
      return lastPromise = lastPromise.then( () => {

        //actual request after the last promise has been resolved
        return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
          .then( datasetfields => {

            childFilters = [];
            const fields = dataset.fields;
            fields.map (field => {

              const fieldName = field.fieldName;

                //limit based on fieldName
                var limited = datasetfields.filter( fld => {
                  return fld.name === fieldName;
                })

                //get the id of the field from the api
                const fieldId = limited[0].fieldId

                //get the values to pass for criteria
                //   this is for searching for the metadata
                const fieldValues = field.fieldValues


                const childFilter =  {
                			"filterType": "between",
                			fieldId,
                      "firstValue": fieldValues[0].value,
                			"secondValue": fieldValues[1].value
                    }

                childFilters.push(childFilter);

            })

            //get start and end date
            var endDate = new Date();
            var start = new Date().setDate(endDate.getDate() - metadata_from_days_ago);
            var startDate = new Date(start)


            //searchrequest test
            //needs refactoring
            // var searchrequest = 	{
            //   "datasetName": datasetName,
            // 	startDate,
            // 	endDate,
            // 	"lowerLeft": null,
            // 	"upperRight": null,
            //   "additionalCriteria": {
            //     "filterType": "and",
            //     childFilters
            //   },
            //   node,
            // 	"maxResults": 20,
            // 	"startingNumber": 1,
            // 	"sortOrder": "ASC"
            // };
            var lowerLeft;
            var upperRight;
            // var startDate;
            // var endDate;
            var months;
            var includeUnknownCloudCover;
            var minCloudCover;
            var maxCloudCover;
            var additionalCriteria = {
              "filterType": "and",
              childFilters
            };
            var maxResults = 20;
            var startingNumber = 1 ;
            var sortOrder = "ASC";

            var search_body = USGS_FUNCTION.usgsapi_search(apiKey, node, datasetName, lowerLeft, upperRight , startDate, endDate,
                                          months, includeUnknownCloudCover, minCloudCover,
                                           maxCloudCover, additionalCriteria, maxResults, startingNumber,
                                           sortOrder);

            const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('search');
            // return lastPromise = lastPromise.then( () => {
            //
            //
            // })
                //OKAY blocked again by other calls to api.  why only one
                  USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, search_body)
                      .then( re => {
                        console.log(re)
                        console.log('')
                        console.log('')
                      }).catch(function(error) {
                        console.log('search: ' + error);
                      });



            // console.log(search_body);
            console.log(JSON.stringify(search_body))
            console.log('')
            console.log('')
            console.log('----')

            //errror for current promise
          }).catch(function(error) {
            console.log('datasetfields' + error);
          });
      //error for last promise
      }).catch(function(error) {
        console.log(error);
      });


    })
  // })
})
