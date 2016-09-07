var axios = require('axios');
var http = require('http');
var yaml = require('yamljs');
var xml2js = require('xml2js');
var parseString = require('xml2js').parseString;
var stripPrefix = require('xml2js').processors.stripPrefix;


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

//get the CONFIG_YAML defined days ago
// tells how may days to go back.
const metadata_from_days_ago = METADATA_YAML.metadata_from_days_ago;

//login and get promise for api key
var api_key = USGS_HELPER.get_api_key();

//set default node
const node = USGS_CONSTANT.NODE_EE;

var additionalCriteria = "";

//captures lastpromise first one is resolved
var lastPromise = Promise.resolve();

//limit data from json object
var limit_json = function(json, limit_indexs, limit_value){
  //get count of indexes.  deal with nested data...
  const count = limit_indexs.length;

  return json.filter( data => {
    switch (count) {
      case 1:
        return data[limit_indexs[0]] === limit_value;
        break;
      case 2:
        return data[limit_indexs[0]][limit_indexs[1]] === limit_value;
        break;
      case 3:
        return data[limit_indexs[0]][limit_indexs[1]][limit_indexs[2]] === limit_value;
        break;
      default:
    }
  })
};

//make child filter json object
var make_child_filter = function(filterType, fieldId, firstValue, secondValue){
  return {
    filterType,
    fieldId,
    firstValue,
    secondValue
  }
};

//make additionalCriteria filter json object
var make_additionalCriteria_filter = function(filterType, childFilters){
  return {
    filterType,
    childFilters
  };
};

//get a date from n (days_ago) days
var get_start_date = function(days_ago){
  return new Date(new Date().setDate(new Date().getDate() - days_ago));
};

//return child filter aray
var get_child_filters = function(fields_json, datasetfields){

  var array = [];

  //walk through all te
  fields_json.map( (field) => {

    //get field name from fields json in CONFIG_YAML
    const fieldName = field.fieldName;

    const limit_indexs = ['name'];

    //limit json in datasetfields (from USGS api) based on fieldName in CONFIG_YAML
    //   this will allow the usgs API to dynamicall figure out the currect fieldid
    const limited = limit_json(datasetfields, limit_indexs, fieldName)

    //get the id of the field from the api
    const fieldId = limited[0].fieldId

    //get the values to pass for criteria
    //   this is for searching for the metadata
    const fieldValues = field.fieldValues

    const filterType = "between";
    const firstValue = fieldValues[0].value;
    const secondValue = fieldValues[1].value;

    //get filters (child) for additionalCriteria array
    const childFilter = make_child_filter(filterType, fieldId, firstValue, secondValue)

    //add to the childFilters array
    array.push(childFilter);

  })

  return array
};


var get_browse_url_fieldset = function(browse_json, databaseFieldName, configFieldName){

  var fieldValue;

  //walk all the fields in the metadata file
  browse_json.map( browse => {

    //get all the browse thumbnail images
    const browse_urls_json = browse.browse;

    //walk the browse url data and get the browselink
    browse_urls_json.map( url => {

      //get the caption for the images
      const caption = url.data.caption;

      //only interested in the human readable image no sensor
      if('LandsatLook "Natural Color" Preview Image' === caption){

        //set the field value
        fieldvalue = url.browseLink[0];
      } // natural color caption

    }) //browse_urls_json.map
  }) // browse_json.map

    return {
      configFieldName,
      databaseFieldName,
      fieldvalue
    };

};

//fix data_type_l1
var fix_data_type_l1_vals = function(databaseFieldName, fieldvalue){

  //not sure how to handle this in config.
  // maybe the db field definition needs to change so it accepts longer text
  // so we do not mutate the data.
  if (databaseFieldName === "data_type_l1" &&
      fieldvalue.indexOf("+") > 0){

    //set the field value when there is too many chartacters for db some extra wierd chartacters
    //  returned from api so we strip it out
    return fieldvalue.split(/\s+/)[1];

  };//data type fix

  //if not data_type_l1 then just return value
  return fieldvalue
};

var get_api_fieldset = function(field_json, configFieldName, databaseFieldName){

  //set limit_indexs
  const limit_indexs = ['data','name'];

  //filter the field using the CONFIG_YAML fieldName
  const filteredField = limit_json(field_json, limit_indexs, configFieldName)

  const rawFieldValue = filteredField[0].metadataValue[0].value;

  //set the field value
  fieldvalue = fix_data_type_l1_vals(databaseFieldName, rawFieldValue);


  return {
    configFieldName,
    databaseFieldName,
    fieldvalue
  };
};

var get_constant_fieldset = function(configFieldName, databaseFieldName){

  //set the field value
  fieldvalue = configFieldName;

  return {
    configFieldName,
    databaseFieldName,
    fieldvalue
  };
}
//walk the datasets from the CONFIG_YAML
datasets.map( dataset => {
  const datasetName = dataset.datasetName

  api_key
  .then( (apiKey) => {

    //get constant for node "EE"
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

        //get the fields object from CONFIG_YAML
        //  so we can translate the USGS field to a field id from USGS api
        const fields = dataset.fields;

        //create the childFilters object
        const childFilters = get_child_filters (fields, datasetfields);

        //get start and end date
        var endDate = new Date();

        //get start date
        const startDate = get_start_date(metadata_from_days_ago)

        //instiate search varriables.  this allows to pass undefined varriables
        //  for optional elements
        var lowerLeft;
        var upperRight;
        var months;
        var includeUnknownCloudCover;
        var minCloudCover;
        var maxCloudCover;

        //set filter type for additionalCriteria json
        const filterType = "and";

        //make additionalCriteria filter
        var additionalCriteria = make_additionalCriteria_filter(filterType, childFilters);

        //defaults will move to config yaml
        var maxResults = 20;
        var startingNumber = 1 ;
        var sortOrder = "ASC";

        //create search body json
        var search_body = USGS_FUNCTION.usgsapi_search(
          apiKey,
          node,
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
          sortOrder);

          console.log(search_body)

          //create request code for searching for available scenes
          const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('search');

          //blocking by other calls to USGS api. there is a 1 call limit imposed by USGS.
          //  so have to return all promises to make sure they finish.
          // make the call to the usgs to get available data and the metadata url
          return USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, search_body)
            .then( search_response => {

            //walk the search_response and start to collect the
            //  info for inserting into db
            search_response.results.map(entity => {

              console.log(entity.summary)
              console.log(entity.metadataUrl)

              //metadata is not throttled so we can get all of this with normal patterns! yeah!
              axios.get(entity.metadataUrl)
              .then( metadata => {

                //get xml from USGS api
                const xml = metadata.data;

                //parse xml to json.... a bit messy needs some fixes which can be done with parser
                var parser = new xml2js.Parser();

                //parse xml to json remove prefixes because it would be near impossible
                //  to walk the JSON data with prefixes
                //  change the key from '$' to 'data' $ would be a pain to walk also.
                //  change the charkey from '_' to value _ would be a pain to walk also and
                parseString(xml,
                  { tagNameProcessors: [stripPrefix],
                    attrkey:'data',
                    charkey:'value' },
                    function(err, js) {

                      //make sure there are no errors
                      if(err) throw err;

                      //convert to js array
                      const metadata_json = [js];

                      //walk the json and get the metadata
                      // also need to get browse links
                      metadata_json.map( metadata => {

                        //get the fields metadata from usgs xml
                        const fields_json = metadata.scene.metadataFields

                        //get the image url's for thumbnails metadata from usgs xml
                        const browse_json = metadata.scene.browseLinks

                        //walk all the fields in the metadata file
                        fields_json.map( fields => {

                          //get the json for each field, yes lots of nesting
                          const field_json = fields.metadataField;

                          //insitate some varriables we need no matter what.
                          // might be better to put this into an array?s
                          var fieldvalue;
                          var fieldName;
                          var databaseFieldName;

                          //get the CONFIG_YAML metadata definitions
                          //  this will tell us what and how to get metadata for the database.
                          const metdataFields = dataset.metdataFields;

                          //walk each definition from the CONFIG_YAML
                          metdataFields.map( meta => {

                            //get the database field name from the CONFIG_YAML
                            databaseFieldName = meta.field[0].databaseFieldName;
                            configFieldName = meta.field[0].fieldName;

                            //get the method to use for the metadata 3 types
                            //  api use a field from the USGS metadata xml
                            //  api_browse use a field from the USGS metadata browse (thumbnails) xml
                            //  constant use a defined value.  the value to use will be in the fieldName
                            const method = meta.field[0].method;
                            var fieldSet;

                            //if the method is api_browse then get the thumbnail for
                            if( method === 'api_browse'){
                              fieldSet = get_browse_url_fieldset(browse_json, databaseFieldName, configFieldName);
                              console.log(fieldSet);
                            }; // api_browse method;

                            if( method === 'api'){

                              fieldSet = get_api_fieldset(field_json, configFieldName, databaseFieldName);
                              console.log(fieldSet);


                            }; //api method

                            //method type constant
                            if( method === 'constant'){
                              fieldSet = get_constant_fieldset(configFieldName, databaseFieldName);
                              console.log(fieldSet);

                            }; //constant method

                            //field name
                            // console.log(fieldName);
                            // console.log(databaseFieldName);
                            // console.log(fieldvalue);

                          })//metdataFields.map
                        })//fields_json.map
                      })//metadata_json.map
                    })//parseString parse xml into JSON



                  }).catch( (error) => {
                    console.log(error);
                  })//axios.get(entity.metadataUrl)

                }); //search_response.results.map
              }).catch(function(error) {
                console.log('search: ' + error);
              }); //search USGS API call


              //error for current promise
            }).catch(function(error) {
              console.log('datasetfields' + error);
            }); //datasetfields from USGS API call

            //error for last promise
          }).catch(function(error) {
            console.log(error);
          }); //last promise not real used to make sure the last promise has completed
          //  since USGS limits api calls to one at a time
        })
      })
