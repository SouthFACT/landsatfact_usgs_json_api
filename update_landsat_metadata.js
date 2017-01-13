
// Libraries
var axios = require('axios')
var yaml = require('yamljs')
var xml2js = require('xml2js')
var parseString = require('xml2js').parseString
var stripPrefix = require('xml2js').processors.stripPrefix
var Promise = require('bluebird')
Promise.longStackTraces()

// Modules
var usgs_constants = require("./lib/usgs_api/usgs_constants.js")
var usgs_functions = require("./lib/usgs_api/usgs_functions.js")
var usgs_helpers = require("./lib/usgs_api/usgs_helpers.js")
var app_helpers = require('./lib/helpers/app_helpers.js')()
const update_lsf_database = require("./lib/postgres/update_lsf_database.js")

// Logging
const LOG_LEVEL_INFO = 'info'
const LOG_LEVEL_ERROR = 'error'
const LOG_FILE = 'update_landsat_metadata'

app_helpers.delete_old_files(LOG_FILE, 'logs/', '.log')
update_lsf_database.delete_update_logs()
app_helpers.set_logger_level('debug')
app_helpers.set_logfile(LOG_FILE)
app_helpers.write_message(LOG_LEVEL_INFO, 'START '+LOG_FILE, '')

// Base URL for axios
axios.defaults.baseURL = usgs_constants.USGS_URL

// Metadata for landsat datasets
const METADATA_YAML = yaml.load("./config/metadata.yaml")
const datasets = METADATA_YAML.metadata_datasets

// Number of previous days to process metadata
const metadata_from_days_ago = METADATA_YAML.metadata_from_days_ago

// USGS API login promise
var api_key = usgs_helpers.get_api_key()

//limit data from json object
var limit_json = function(json, limit_keys, limit_value){
  //get count of indexes.  deal with nested data...
  const count = limit_keys.length

  // only allow up to three nestings.
  return json.filter( data => {
    switch (count) {
      case 1:  //one nested keyu
        return data[limit_keys[0]] === limit_value
        break
      case 2:
        return data[limit_keys[0]][limit_keys[1]] === limit_value
        break
      case 3:
        return data[limit_keys[0]][limit_keys[1]][limit_keys[2]] === limit_value
        break
      default:
    }
  })
}

//make child filter json object
var make_child_filter = function(filterType, fieldId, firstValue, secondValue){
  return {
    filterType,
    fieldId,
    firstValue,
    secondValue
  }
}

//make additionalCriteria filter json object
var make_additionalCriteria_filter = function(filterType, childFilters){
  return {
    filterType,
    childFilters
  }
}

//get a date from n (days_ago) days
var get_start_date = function(days_ago){
  return new Date(new Date().setDate(new Date().getDate() - days_ago))
}

//return child filter aray

// needs an json object of fields to limit another json object of metadata fields returned from
//  the USGS api
var get_child_filters = function(fields_json, datasetfields){

  // instiate a blank array
  var array = []

  //walk through all te
  fields_json.map( (field) => {

    //get field name from fields json in CONFIG_YAML
    const fieldName = field.fieldName

    const limit_keys = ['name']

    //limit json in datasetfields (from USGS api) based on fieldName in CONFIG_YAML
    //   this will allow the usgs API to dynamicall figure out the currect fieldid
    const limited = limit_json(datasetfields, limit_keys, fieldName)

    //get the id of the field from the api
    const fieldId = limited[0].fieldId

    //get the values to pass for criteria
    //   this is for searching for the metadata
    const fieldValues = field.fieldValues

    const filterType = "between"
    const firstValue = fieldValues[0].value
    const secondValue = fieldValues[1].value

    //get filters (child) for additionalCriteria array
    const childFilter = make_child_filter(filterType, fieldId, firstValue, secondValue)

    //add to the childFilters array
    array.push(childFilter)

  })

  //return the metadata fields and values that contain only
  //  the fields we want to insert into the landsat fact database
  return array
}


//returns a field name and field value object for a metadata field
//  this field set will be combined to create a metada record for insertion
//  into the Landsat Fact Datbase
//    this function is for creating a the field set when the value is defined
//    by the USGS API in the browse element.  this element holds all the thumbnail images
//    of the scene
var get_browse_url_fieldset = function(browse_json, databaseFieldName, configFieldName){

  var fieldValue
  var name = databaseFieldName

  //walk all the fields in the metadata file
  browse_json.map( browse => {

    //get all the browse thumbnail images
    const browse_urls_json = browse.browse

    //walk the browse url data and get the browselink
    browse_urls_json.map( url => {

      //get the caption for the images
      const caption = url.data.caption

      //only interested in the human readable image or RGB image
      if('LandsatLook "Natural Color" Preview Image' === caption){

        //set the field value
        fieldValue = url.browseLink[0]
      } // natural color caption

    }) //browse_urls_json.map
  }) // browse_json.map

  const value = fieldValue

  return {
    name,
    value
  }

}

//fix data_type_l1
//  the data_type_l1 metadata field has too many chartacters that are not used by the
//  Landsat fact database.  in these cases we must make sure the chartacter limit of 5
//  characters will not fail to insert into the database so we strip out characters that are not needed.
//  from visual inspeaction this happens when the + charater has text before it.  any charaters
//    before the + character is not needed for our use case so we strip it out.
var fix_data_type_l1_vals = function(databaseFieldName, fieldValue){

  //PROCESSING REQUIRED is too long for field, this field is 5 chartacters in the db
  // so calling prreq
  if (fieldValue === 'PROCESSING REQUIRED'){
    return "PRREQ"
  }


  //not sure how to handle this in config.
  // maybe the db field definition needs to change so it accepts longer text
  // so we do not mutate the data.
  if (databaseFieldName === "data_type_l1" && fieldValue.indexOf("+") > 0){

    //set the field value when there is too many chartacters for db some extra wierd chartacters
    //  returned from api so we strip it out
    return fieldValue.split(/\s+/)[1]

  }//data type fix

  //if not data_type_l1 then just return value
  return fieldValue
}

//returns a field name and field value object for a metadata field
//  this field set will be combined to create a metada record for insertion
//  into the Landsat Fact Datbase
//    this function is for creating a the field set when the value is defined
//    by the USGS API
var get_api_fieldset = function(field_json, configFieldName, databaseFieldName){

  var name = databaseFieldName

  //set limit_keys
  const limit_keys = ['data','name']

  //filter the field using the CONFIG_YAML fieldName
  const filteredField = limit_json(field_json, limit_keys, configFieldName)

  const rawFieldValue = filteredField[0] ? filteredField[0].metadataValue[0].value : ''

  //set the field value
  const fieldValue = fix_data_type_l1_vals(databaseFieldName, rawFieldValue)

  const value = fieldValue

  return {
    name,
    value
  }

}

//returns a field name and field value object for a metadata field
//  this field set will be combined to create a metada record for insertion
//  into the Landsat Fact Datbase
//    this function is for creating a the field set when the value is a constant or
//    needs be defined by the user rather then the USGS API or is a constant
var get_constant_fieldset = function(configFieldName, databaseFieldName){

  //set the field value
  const value = configFieldName
  const name = databaseFieldName

  return {
    name,
    value
  }
}


//create a json object of all the USGS metadata fieldnames and values
//  for inserting into landsat FACT databaseFieldName
var get_metadata_record_fieldset = function(record_set, field_set){
   var new_array = record_set

   new_array.push(field_set)
   return new_array
}

/////////////////////////////////

const main = function () {
  process_metadata_by_dataset(datasets)
}

const process_metadata_by_dataset = function (datasets) {
  return api_key.then(function () {
    var dataset = datasets.pop()
    return process_metadata_for_dataset(dataset)
  }).catch(function (err) {
    app_helpers.write_message(LOG_LEVEL_ERROR, err.stack)
  }).then(function () {
    app_helpers.write_message(
      LOG_LEVEL_INFO,
      'DONE updating metadata for dataset'
    )
    if (datasets.length) {
      return process_metadata_by_dataset(datasets)
    }
    else {
      app_helpers.write_message(
        LOG_LEVEL_INFO,
        'DONE updating metadata for all datasets'
      )
    }
  })
}

const process_metadata_for_dataset = function (dataset) {
  return api_key.then( (apiKey) => {

    //get the actaul filterid value from the request datasetfields
    const request_body = usgs_functions.usgsapi_datasetfields(apiKey, usgs_constants.NODE_EE, datasetName)
    logger.log('debug', 'dataset fields body' , request_body )

    const USGS_REQUEST_CODE = usgs_helpers.get_usgs_response_code('datasetfields')

    //make call to USGS api.  Make sure last promise is resolved first
    //  becuase USGS api is throttled for one request at a time

      //actual request after the last promise has been resolved
      return usgs_helpers.get_usgsapi_response(USGS_REQUEST_CODE, request_body)
      .then( datasetfields => {

        childFilters = []

        //get the fields object from CONFIG_YAML
        //  so we can translate the USGS field to a field id from USGS api
        const fields = dataset.fields

        //create the childFilters object
        const childFilters = get_child_filters (fields, datasetfields)

        //get start and end date
        var endDate = new Date()

        //get start date
        const startDate = get_start_date(metadata_from_days_ago)

        //instiate search varriables.  this allows to pass undefined varriables
        //  for optional elements
        var lowerLeft
        var upperRight
        var months
        var includeUnknownCloudCover
        var minCloudCover
        var maxCloudCover

        //set filter type for additionalCriteria json
        const filterType = "and"

        //make additionalCriteria filter
        var additionalCriteria = make_additionalCriteria_filter(filterType, childFilters)

        //defaults will move to config yaml
        var maxResults = 5000
        var startingNumber = 1 
        var sortOrder = "ASC"

        //create search body json
        var search_body = usgs_functions.usgsapi_search(
          apiKey,
          usgs_constants.NODE_EE,
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
          sortOrder)

          logger.log('info', 'search')
          logger.log('debug', 'search body' , search_body )

          //create request code for searching for available scenes
          const USGS_REQUEST_CODE = usgs_helpers.get_usgs_response_code('search')

          //blocking by other calls to USGS api. there is a 1 call limit imposed by USGS.
          //  so have to return all promises to make sure they finish.
          // make the call to the usgs to get available data and the metadata url
          return usgs_helpers.get_usgsapi_response(USGS_REQUEST_CODE, search_body)
            .then( search_response => {

            const total = search_response.numberReturned
            var count = 0
            //walk the search_response and start to collect the
            //  info for inserting into db
            search_response.results.map(entity => {


              //metadata is not throttled so we can get all of this with normal patterns! yeah!
              logger.log('debug', 'metadata url' , entity.metadataUrl )

              axios.get(entity.metadataUrl)
              .then( metadata => {

                count += 1

                //get xml from USGS api
                const xml = metadata.data

                var metadata_recordset = new Array()

                //parse xml to json.... a bit messy needs some fixes which can be done with parser
                var parser = new xml2js.Parser()

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
                      if(err) throw err

                      //convert to js array
                      const metadata_json = [js]
                      logger.log('info', 'extracting metadata for: ' + entity.summary)

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
                          const field_json = fields.metadataField

                          //insitate some varriables we need no matter what.
                          // might be better to put this into an array?s
                          var fieldValue
                          var fieldName
                          var databaseFieldName

                          //get the CONFIG_YAML metadata definitions
                          //  this will tell us what and how to get metadata for the database.
                          const metdataFields = dataset.metdataFields

                          //walk each definition from the CONFIG_YAML
                          metdataFields.map( meta => {

                            //get the database field name from the CONFIG_YAML
                            databaseFieldName = meta.field[0].databaseFieldName
                            configFieldName = meta.field[0].fieldName

                            //get the method to use for the metadata 3 types
                            //  api use a field from the USGS metadata xml
                            //  api_browse use a field from the USGS metadata browse (thumbnails) xml
                            //  constant use a defined value.  the value to use will be in the fieldName
                            const method = meta.field[0].method
                            var fieldSet

                            //if the method is api_browse then get the thumbnail for
                            if( method === 'api_browse'){
                              fieldSet = get_browse_url_fieldset(browse_json, databaseFieldName, configFieldName)
                            } // api_browse method

                            if( method === 'api'){

                              fieldSet = get_api_fieldset(field_json, configFieldName, databaseFieldName)

                            } //api method

                            //method type constant
                            if( method === 'constant'){
                              fieldSet = get_constant_fieldset(configFieldName, databaseFieldName)

                            } //constant method

                            //merge the fieldset into the recordset
                            const records = get_metadata_record_fieldset(metadata_recordset, fieldSet)
                            metadata_recordset = records

                          })//metdataFields.map
                        })//fields_json.map
                      })//metadata_json.map
                    })//parseString parse xml into JSON

                    logger.log('debug', 'metadata data set' , metadata_recordset )

                    //logger.log('info', metadata_recordset)

                    //console.log(metadata_recordset)
                    //do the insert here
                    update_lsf_database.metadata_to_db(metadata_recordset)
                    //
                    // console.log(count)
                    // console.log(total)
                    if(count === total){
                      logger.log('info','update metadata end for ' + datasetName)
                    }

                  }).catch( (error) => {
                    // console.error('get metadata: ' + error)
                    logger.log('error', 'metadata error: ' + error)

                  })//axios.get(entity.metadataUrl)

                }) //search_response.results.map
              }).catch(function(error) {
                // console.error('search: ' + error)
                logger.log('error', 'search error: ' + error)

              }) //search USGS API call


              //error for current promise
            }).catch(function(error) {
              // console.error('datasetfields' + error)
              logger.log('error', 'datasetfields error: ' + error)

            }) //datasetfields from USGS API call

            //error for last promise
          }).catch(function(error) {
            console.error('last promise: ' + error)
            logger.log('error', 'last promise error: ' + error)

          }) //last promise not real used to make sure the last promise has completed
          //  since USGS limits api calls to one at a time
        })
      })
      logger.log('info','update metadata end')
}


//walk the datasets from the CONFIG_YAML
datasets.map( dataset => {
  const datasetName = dataset.datasetName

