var axios = require('axios');
var http = require('http');
var yaml = require('yamljs');
var async = require("async");

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

//login and get promise for api key
var api_key = USGS_HELPER.get_api_key();

var get_fieldID = function(apiKey,node,datasetName,fieldName){

  //get the actaull filterid value from the request datasetfields
  const request_body = USGS_FUNCTION.usgsapi_datasetfields(apiKey, node, datasetName);
  const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('datasetfields');

  //make call to USGS api
  return usgs_response = USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body);
}

promises = [];

api_key
  .then( (apiKey) => {

    const node = USGS_CONSTANT.NODE_EE;
    const datasetName = ["LANDSAT_8","LANDSAT_ETM"]
    const fieldName = "WRS Path"
    var prom;

    datasetName.map( (dataset) => {
      const promise = get_fieldID(apiKey,node,dataset,fieldName)

      promise.then( result => {
        // console.log(result);
        console.log("finised successful")
        // console.log(result)
      })
      .catch( error => {
        console.log(result);
        console.log(error);
      })

    })

    // console.log(promises)
    // axios.all( promises )
    //   .then( results => {
    //     results.map( response => {
    //       console.log(response);
    //     })
    //   })
    //   .catch( error => {
    //     console.log(error);
    //   })



  })


// then get make metadata request for each datasetname
  //each request needs an additionalCriteria which consists of a fieldid and values (path row on our case)
      //need to get field id from values
      //after additionalCriteria make metada request
      //from metadata get url to full metadata
        //retrieve full metadata
          //make insert into database.
  //each request needs apikey


//get metadata for each datasetname



//get JSON requests for file ids...



//get JSON requests for



// //if promised resolved do task
// api_key
//   .then( (data) => {
//     //set apikey
//     const apiKey = data;
//     const node = USGS_CONSTANT.NODE_EE;
//     console.log(apiKey);
//
//     //get datasets from yaml should be [LANDSAT_8, LANDSAT_ETM, LANDSAT_ETM_SLC_OFF, LANDSAT_TM]
//     //  this is expandable to include any datasetName offered by the USGS api.  you only have to add it to
//     //  the dataset to the yaml
//     datasets.map( dataset  => {
//
//       //get the USGS dataset name
//       console.log(dataset.datasetName);
//       const datasetName = dataset.datasetName
//
//       //filter type for the dataset
//       console.log(dataset.datasetFilterType);
//       const datasetFilterType = dataset.datasetFilterType
//
//       //filter type for the dataset
//       console.log(dataset.fieldId);
//       const fieldId = dataset.fieldId
//
//
//       //get the fields to retrieve for this dataset.
//       //  where doing this to format the JSON request for retrieving metadata.
//       //  The USGS api uses the field id to filter data in the search for metadata.
//       //  In the past this has broken when the id has changed so instead we will get the ID from the API.
//       //  Also it has been very difficult to decipher what the fileid stands for.  to decipher now we just look at the
//       //  yaml file metadata.yaml.  and look at the fieldName.  we can add as many filters as we want using the filter type
//       //  as determined by the filterType.  (filtertype is defined by the USGS api)
//       const fields = dataset.fields;
//
//
//
//
//       //in each dataset get the filter fields
//       fields.map (field => {
//
//         //get the field name in english.  should match the fieldname in usgs response from the request datasetfields
//         //  datasetfields request
//         console.log('  ' + field.fieldName);
//         const fieldName = field.fieldName;
//
//         //get the actaull filterid value from the request datasetfields
//         const request_body = USGS_FUNCTION.usgsapi_datasetfields(apiKey, node, datasetName);
//         const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('datasetfields');
//
//         //make call to USGS api
//         var usgs_responses = USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, request_body);
//
//         // // usgs response
//         // usgs_response
//         //   .all( datasetfields => {
//         //
//         //     console.log(datasetfields)
//         //
//         //     var limited = datasetfields.filter( fld => {
//         //       console.log('filter')
//         //       console.log(fld.name)
//         //       console.log(fieldName)
//         //       console.log('filter')
//         //       return fld.name === fieldName;
//         //     })
//         //
//         //     console.log(limited);
//         //
//         //   })
//         //   //catch http errors not return errors in response
//           // .catch( error => {
//           //   return USGS_HELPER.throw_error(error);;
//           // });
//
//
//
//         //get the filter for field level
//         console.log('  ' + field.fieldFilterType);
//
//         //in each field get the field values to limit
//         const fieldValues = field.fieldValues;
//
//         //get the value filters to use.
//         //each field has a value
//         fieldValues.map( fieldValue => {
//           console.log('    ' + fieldValue.value);
//         })
//
//       })
//     })
//
//
//   }
// )


//get all scences of our area for past 10 days or N days
//area defined by only path rows?
  //for filters of path row get the field ids from api datasetfields
  // the use that to filter metadata

//then
//loop all datasets LANDSAT 8, 7, and 5 because get metadata requires a datasetName which is LANDSAT platform (8,7,5)
// not clear about why we need wrs2 codes in csv files? not doing until proven otherwise.
//  get metadata

// or should we just from path row
