/**
 * Check for any newly added scenes and add
 * relevant scene metadata to the metadata table.
 *
 */


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

const USGS_DATASET_FIELDS_REQUEST_CODE = usgs_helpers
      .get_usgs_response_code('datasetfields')
const USGS_SEARCH_REQUEST_CODE = usgs_helpers
      .get_usgs_response_code('search')

// dataset metadata object from metadata.yaml
// declared here so we have access to it within the
// processor function for the xml parser.

/////////////////////////////////

/**
 * TODO
 * - documentation
 * - tests
 * - refactor process_search_response to use recursion/promise convention
 */

const main = function () {
  process_metadata_by_dataset(datasets)
}

const process_metadata_by_dataset = function (datasets) {
  return api_key.then(function (apiKey) {
    var dataset = datasets.pop()
    return process_metadata_for_dataset(apiKey, dataset)
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

const process_metadata_for_dataset = function (apiKey, dataset) {
  return get_dataset_fields_for_dataset(apiKey, dataset).then( dataset_fields => {
    return do_search_request(apiKey, dataset, dataset_fields).then(search_response => {
      return process_search_response(dataset, search_response)
    })
  })
}

const get_dataset_fields_for_dataset = function (apiKey, dataset) {
  app_helpers.write_message(
    LOG_LEVEL_INFO,
    'START USGS datasetfields request for dataset',
    dataset.datasetName
  )
  const request_body = usgs_functions.usgsapi_datasetfields(
    apiKey, usgs_constants.NODE_EE, dataset.datasetName
  )
  return usgs_helpers.get_usgsapi_response(
    USGS_DATASET_FIELDS_REQUEST_CODE,
    request_body
  ).catch(function (err) {
    app_helpers.write_message(
      LOG_LEVEL_ERROR,
      'ERROR during datasetfields USGS request',
      err.stack
    )
  }).then(function (response) {
    if (response) {
      app_helpers.write_message(
        LOG_LEVEL_INFO,
        'USGS datasetfields request completed successfully for dataset',
        dataset.datasetName
      )
    }
    return response
  })

}

const process_search_response = function (dataset, search_response) {
  return search_response.results.forEach(scene_obj => {
    get_metadata_xml_for_scene(scene_obj).then( metadata_xml => {
      parse_scene_metadata_xml(metadata_xml).then( metadata_as_json => {
        var records = process_scene_metadata(dataset, metadata_as_json)
        //update_lsf_database.metadata_to_db(records)
      })
    })
  })
}

const get_metadata_xml_for_scene = function (scene_obj) {
  return axios.get(scene_obj.metadataUrl)
    .catch(function (err) {
      app_helpers.write_message(
        LOG_LEVEL_ERROR,
        'ERROR retrieving metadata xml during axios request',
        err.stack
      )
    })
}

const do_search_request = function (apiKey, dataset, dataset_fields) {
  app_helpers.write_message(
      LOG_LEVEL_INFO,
      'START USGS search request for dataset ',
      dataset.datasetName
  )
  // search request parameters
  const startDate = get_start_date(metadata_from_days_ago)
  var endDate = new Date()
  // defaults will move to config yaml
  var maxResults = 5000
  var startingNumber = 1 
  var sortOrder = "ASC"
  // additional criteria filter
  const fields = dataset.fields
  const childFilters = get_child_filters(fields, dataset_fields)
  const filterType = "and"
  var additionalCriteria = make_additionalCriteria_filter(
    filterType, childFilters
  )
  // Instantiate so we can pass undefined variables for optional elements.
  var lowerLeft, upperRight, months, includeUnknownCloudCover,
      minCloudCover, maxCloudCover
  
  var search_body = usgs_functions.usgsapi_search(
    apiKey, usgs_constants.NODE_EE, dataset.datasetName,
    lowerLeft, upperRight, startDate, endDate, months,
    includeUnknownCloudCover, minCloudCover, maxCloudCover,
    additionalCriteria, maxResults, startingNumber, sortOrder
  )
  
  return usgs_helpers.get_usgsapi_response(
    USGS_SEARCH_REQUEST_CODE,
    search_body
  ).catch(function (err) {
    app_helpers.write_message(
      LOG_LEVEL_ERROR,
      'ERROR during USGS search request',
      err.stack
    )
  }).then(function (response) {
    if (response) {
      app_helpers.write_message(
        LOG_LEVEL_INFO,
        'USGS search request completed successfully for dataset',
        dataset.datasetName
      )
      return response
    }
  })

}


const parse_scene_metadata_xml = function (metadata) {
  //get xml from USGS api
  const xml = metadata.data

  return new Promise(function (resolve, reject) {
    // parse xml to json, removing xml tag prefixes
    // change the attribute key from '$' to 'data' 
    // change the charkey from '_' to 'value'
    var parser = new xml2js.Parser()
    parseString(
      xml,
      {
        tagNameProcessors: [stripPrefix],
        attrkey:'data',
        charkey:'value'
      },
      function (err, js) {
        if(err) {
          app_helpers.write_message(
            LOG_LEVEL_ERROR,
            'ERROR parsing scene metadata xml',
            err.stack
          )
          reject(err)
        }
        const metadata_json = [js]

        resolve(metadata_json)
      }
    )
  })
}

const process_scene_metadata = function (dataset, metadata_json) {
  var records = []
  metadata_json.forEach( metadata => {
    const scene_metadata_fields = metadata.scene.metadataFields
    //get the image urls for thumbnails metadata from usgs xml
    const browse_json = metadata.scene.browseLinks
    scene_metadata_fields.forEach( metadata_field => {
      process_metadata_field(
        dataset, metadata_field, browse_json, records
      )
    })
  })
  return records

}

const process_metadata_field = function (dataset, metadata_field, browse_json, records) {
  const field_json = metadata_field.metadataField
  // Instantiate so we can pass undefined variables for optional elements.
  var fieldValue, fieldName, databaseFieldName
  const metadata_fields = dataset.metadataFields

  //walk each definition from the CONFIG_YAML
  metadata_fields.forEach( meta => {

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
      fieldSet = get_browse_url_fieldset(
        browse_json,
        databaseFieldName,
        configFieldName
      )
    } // api_browse method

    if( method === 'api'){

      fieldSet = get_api_fieldset(
        field_json,
        configFieldName,
        databaseFieldName
      )

    } //api method

    //method type constant
    if( method === 'constant'){
      fieldSet = get_constant_fieldset(configFieldName, databaseFieldName)

    } //constant method

    records.push(fieldSet)

  })

}




// Helpers

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
var get_child_filters = function(fields_json, dataset_fields){

  // instiate a blank array
  var array = []

  //walk through all te
  fields_json.map( (field) => {

    //get field name from fields json in CONFIG_YAML
    const fieldName = field.fieldName

    const limit_keys = ['name']

    //limit json in dataset_fields (from USGS api) based on fieldName in CONFIG_YAML
    //   this will allow the usgs API to dynamically figure out the correct fieldid
    const limited = limit_json(dataset_fields, limit_keys, fieldName)

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

      //only interested in the human readable image or RGB image
      const id = url.data.id

      if(id === 'BROWSE_REFL_WMS_PATH'){

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
//  the data_type_l1 metadata field has too many characters that are not used by the
//  Landsat fact database. in these cases we must make sure the chartacter limit of 5
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
//  this field set will be combined to create a metadata record for insertion
//  into the Landsat Fact Database
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

main()



module.exports = {
  main,
  process_metadata_by_dataset,
  process_metadata_for_dataset,
  get_dataset_fields_for_dataset,
  process_search_response,
  get_metadata_xml_for_scene,
  do_search_request,
  parse_scene_metadata_xml,
  process_scene_metadata,
  process_metadata_field,
  limit_json,
  make_child_filter,
  make_additionalCriteria_filter,
  get_start_date,
  get_child_filters,
  get_browse_url_fieldset,
  fix_data_type_l1_vals,
  get_api_fieldset,
  get_constant_fieldset
}