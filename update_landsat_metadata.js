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

//due to usgs api control limits of one request at time..
var metadata_body = [];

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

            var lowerLeft;
            var upperRight;
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
            console.log(search_body)
            const USGS_REQUEST_CODE = USGS_HELPER.get_usgs_response_code('search');
            metadata_body.push(search_body)

            //OKAY blocked again by other calls to api.  so have to return all promises to make sure
            //  they finsih
            return  USGS_HELPER.get_usgsapi_response(USGS_REQUEST_CODE, search_body)
                  .then( re => {

                    re.results.map(entity => {
                      console.log(entity.summary)
                      console.log(entity.metadataUrl)
                      //at last not throttled so we can get all of this! yeah!
                      axios.get(entity.metadataUrl)
                        .then( metadata => {
                          // console.log(metadata.data)
                          const xml = metadata.data;
                          // console.log(xml)

                          //parse xml to json.... but its messy
                          var parser = new xml2js.Parser();

                          //parse xml to json remove prefixes because it would be near impossible
                          //  to walk the JSON data with prefixes
                          //  change the key from '$' to 'data' $ would be a pain to walk also.
                          //  change the charkey from '_' to value _ would be a pain to walk also and
                          //   need this is what happens att the metadata value
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
                                const json_string = JSON.stringify(metadata.scene.metadataFields)
                                const fields_json = metadata.scene.metadataFields
                                const browse_json = metadata.scene.browseLinks


                                //walk all the fields in the metadata file
                                fields_json.map( fields => {
                                    const field_json = fields.metadataField;

                                    var fieldvalue;
                                    var fieldName;
                                    var databaseFieldName;

                                    const metdataFields = dataset.metdataFields;

                                    metdataFields.map( meta => {

                                      databaseFieldName = meta.field[0].databaseFieldName
                                      const method = meta.field[0].method;

                                      if( method === 'api_browse'){

                                        //walk all the fields in the metadata file
                                        browse_json.map( browse => {


                                          const browse_urls_json = browse.browse;

                                          //walk the browse url data and get the browselink
                                          browse_urls_json.map( url => {
                                            const caption = url.data.caption;
                                            if('LandsatLook "Natural Color" Preview Image' === caption){
                                              fieldName = meta.field[0].fieldName;
                                              fieldvalue = url.browseLink[0];
                                            }

                                            // console.log(url);
                                            // console.log('');
                                          })

                                        })

                                      }

                                      if( method === 'api'){

                                          const filteredField = field_json.filter( field => {
                                            // console.log(meta.fieldName);
                                            // console.log(field.data.name);

                                            return field.data.name === meta.field[0].fieldName;
                                          })

                                          fieldName = meta.field[0].fieldName;
                                          fieldvalue = filteredField[0].metadataValue[0].value;

                                          //not sure how to handle this in config.  maybe the db needs to change?
                                          // so we do not mutate the data.
                                          if (databaseFieldName === "data_type_l1" &&
                                              filteredField[0].metadataValue[0].value.indexOf("+") > 0){

                                            fieldvalue = filteredField[0].metadataValue[0].value.split(/\s+/)[1];
                                          }

                                       }

                                       if( method === 'constant'){
                                         fieldName = databaseFieldName;
                                         fieldvalue = meta.field[0].fieldName;

                                       }

                                      //field name
                                      console.log(fieldName);
                                      console.log(databaseFieldName);
                                      console.log(fieldvalue);

                                    })

                                    console.log('');
                                    console.log('');
                                    // //walk each field and get its value
                                    // //  need to just pul the ones I care about..
                                    // field_json.map( field => {
                                    //   // console.log(field.data.name);
                                    //   // console.log(field.metadataValue[0].value);
                                    //   //
                                    //   // console.log('');
                                    //
                                    // })
                                })
                                // console.log(json_string);
                                // console.log('');

                            })
                          })

                          // parser.parseString(metadata.data, {   tagNameProcessors: [stripPrefix] },(err, result) => {
                          //
                          //       // const metadataJSON = JSON.parse(result)
                          //         // metadataJSON.map( xmlwalker => {
                          //         //   console.log("walk")
                          //         //   console.log(xmlwalker);
                          //       // })
                          //       //console.log(result);
                          //       console.log(JSON.stringify(result));
                          //       console.log('Done');
                          //     });
                          // console.log('');
                          // console.log('');

                        }).catch( (error) => {
                          console.log(error);
                        })

                    })
                  }).catch(function(error) {
                    console.log('search: ' + error);
                  });

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
