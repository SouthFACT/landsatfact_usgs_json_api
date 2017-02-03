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

// Logging
const LOG_FILE = 'update_landsat_metadata'
var logger = require('./lib/helpers/logger.js')(LOG_FILE)
// Set here so modules can see in require.main.exports
module.exports.logger = logger

// Modules
var usgs_constants = require("./lib/usgs_api/usgs_constants.js")
var usgs_functions = require("./lib/usgs_api/usgs_functions.js")
var usgs_helpers = require("./lib/usgs_api/usgs_helpers.js")
var app_helpers = require('./lib/helpers/app_helpers.js')()
const update_lsf_database = require("./lib/postgres/update_lsf_database.js")

// Base URL for axios
axios.defaults.baseURL = usgs_constants.USGS_URL

// Metadata for landsat datasets
var METADATA_YAML = yaml.load("./config/metadata.yaml")
var metadata_config = METADATA_YAML.metadata_datasets

// Number of previous days to process metadata
const metadata_from_days_ago = METADATA_YAML.metadata_from_days_ago

// USGS API login promise
var api_key = usgs_helpers.get_api_key()

const USGS_DATASET_FIELDS_REQUEST_CODE = usgs_helpers
      .get_usgs_response_code('datasetfields')
const USGS_SEARCH_REQUEST_CODE = usgs_helpers
      .get_usgs_response_code('search')

module.exports = {
  main,
  update_metadata_for_all_datasets,
  update_metadata_for_dataset_scenes,
  get_metadata_filter_fields_for_dataset,
  make_records_from_search_response,
  get_metadata_xml_for_scene,
  do_search_request,
  parse_scene_metadata_xml,
  make_scene_record,
  make_record_field,
  update_db,
  // helpers
  limit_json,
  make_child_filter,
  make_additionalCriteria_filter,
  get_start_date,
  get_child_filters,
  get_browse_url_fieldset,
  fix_data_type_l1_vals,
  get_api_fieldset,
  get_constant_fieldset,

  logger
}

// Run main function if script is run from commandline
if (require.main === module) main()

///////////////////////////////////////////////////////////////////////////////

function main () {
  update_metadata_for_all_datasets(metadata_config)
}

/**
 * Get metadata for any relevant newly added scenes for each Landsat dataset.
 *
 */
function update_metadata_for_all_datasets (metadata_config) {
  return api_key.then(function (apiKey) {
    var dataset_config = metadata_config.pop()
    return update_metadata_for_dataset_scenes(apiKey, dataset_config)
  }).catch(function (err) {
    logger.log(logger.LEVEL_ERROR, err.stack || err)
  }).then(function () {
    if (metadata_config.length) {
      logger.log(
        logger.LEVEL_INFO,
        'DONE updating metadata for dataset'
      )
      return update_metadata_for_all_datasets(metadata_config)
    } else {
      logger.log(
        logger.LEVEL_INFO,
        'DONE updating metadata for all datasets'
      )
    }
  })
}

/**
 * Get metadata for newly added scenes for a Landsat dataset
 *
 */
function update_metadata_for_dataset_scenes (apiKey, dataset_config) {
  return get_metadata_filter_fields_for_dataset(apiKey, dataset_config)
    .then(meta_filter_fields => {
      return do_search_request(apiKey, dataset_config, meta_filter_fields)
        .then(results => {
          return make_records_from_search_response(dataset_config, results)
            .then(records => {
              update_db(records)
            })
            .catch((err) => {
              logger.log(
                logger.LEVEL_ERROR,
                err.stack || err
              )
            })
        })
    })
}


/**
 * Do a 'datasetfields' request to get all the metadata filters for a dataset.
 *
 * These are used to create additionalCriteria filters in a 'search' request.
 * 
 * https://earthexplorer.usgs.gov/inventory/documentation/json-api#datasetfields
 *
 */
function get_metadata_filter_fields_for_dataset (apiKey, dataset_config) {
  logger.log(
    logger.LEVEL_INFO,
    'START USGS datasetfields request for dataset',
    dataset_config.datasetName
  )
  const request_body = usgs_functions.usgsapi_datasetfields(
    apiKey, usgs_constants.NODE_EE, dataset_config.datasetName
  )
  return usgs_helpers.get_usgsapi_response(
    USGS_DATASET_FIELDS_REQUEST_CODE,
    request_body
  ).then(function (response) {
    if (response) {
      logger.log(
        logger.LEVEL_INFO,
        'DONE datasetfields request for dataset',
        dataset_config.datasetName
      )
    } else {
      return Promise.reject(
        new Error('ERROR No response from datasetfields request')
      )
    }
    return response
  })

}

/**
 * Build a list of metadata records based on the results of a search request.
 *
 */
function make_records_from_search_response (dataset_config, search_results, records) {
  records = records || []
  if (!records.length) {
    logger.log(
      logger.LEVEL_INFO,
      'START building ' + search_results.length + ' scene records'
    )
  }
  var scene_obj = search_results.pop()
  return get_metadata_xml_for_scene(scene_obj)
    .then(metadata_xml => {
      return parse_scene_metadata_xml(dataset_config, metadata_xml)
        .then(scene_metadata => {
          return make_scene_record(dataset_config, scene_metadata)
        })
    })
    .catch((err) => {
      logger.log(
        logger.LEVEL_ERROR,
        err.stack || err
      )
    })
    .then(record => {
      records.push(record)
      if (search_results.length) {
        return make_records_from_search_response(dataset_config, search_results, records)
      }
      return records
    })
}

function get_metadata_xml_for_scene (scene_obj) {
  return axios.get(scene_obj.metadataUrl)
}

/**
 * Perform a USGS 'search' request to check for any new scenes
 * that are relevant to this app.
 *
 */
function do_search_request (apiKey, dataset_config, meta_filter_fields) {
  logger.log(
      logger.LEVEL_INFO,
      'START search request for dataset ',
      dataset_config.datasetName
  )
  // search request parameters
  const startDate = get_start_date(metadata_from_days_ago)
  var endDate = new Date()
  // defaults will move to config yaml
  var maxResults = 5000
  var startingNumber = 1 
  var sortOrder = "ASC"
  // additional criteria filter
  const fields = dataset_config.fields
  const childFilters = get_child_filters(fields, meta_filter_fields)
  const filterType = "and"
  var additionalCriteria = make_additionalCriteria_filter(
    filterType, childFilters
  )
  // Instantiate so we can pass undefined variables for optional elements.
  var lowerLeft, upperRight, months, includeUnknownCloudCover,
      minCloudCover, maxCloudCover
  
  var search_body = usgs_functions.usgsapi_search(
    apiKey, usgs_constants.NODE_EE, dataset_config.datasetName,
    lowerLeft, upperRight, startDate, endDate, months,
    includeUnknownCloudCover, minCloudCover, maxCloudCover,
    additionalCriteria, maxResults, startingNumber, sortOrder
  )
  
  return usgs_helpers.get_usgsapi_response(
    USGS_SEARCH_REQUEST_CODE,
    search_body
  ).then(function (response) {
    if (response) {
      logger.log(
        logger.LEVEL_INFO,
        'DONE search request for dataset',
        dataset_config.datasetName
      )
      if (response.results.length) {
        return response.results
      } else {
        return Promise.reject('INFO No results returned from search request')
      }
    }
  })

}

/**
 * Scene metadata is stored as xml. Parse it to json.
 * Returns a promise that resolves to metadata as json,
 * then filters out metadata fields we are not interested in.
 */
function parse_scene_metadata_xml (dataset_config, metadata) {
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
          reject(err)
        }

        resolve(js)
      }
    )
  })
}


/**
 * Build a list of objects representing fields of a record
 * in the metadata table for a single scene.
 */
function make_scene_record (dataset_config, scene_metadata) {
  var field_list = []
  dataset_config.metadataFields.forEach((field_config) => {
    field_config = field_config.field[0]
    var record_field = make_record_field(field_config, scene_metadata)
    if (record_field) field_list.push(record_field)
  })
  return field_list
}


/**
 * Build an object representing a single field for a scene record.
 *
 */
function make_record_field (field_config, scene_metadata) {

  // Instantiate so we can pass undefined variables for optional elements.
  var fieldValue, fieldName, databaseFieldName

  //get the database field name from the CONFIG_YAML
  databaseFieldName = field_config.databaseFieldName
  configFieldName = field_config.fieldName

  //get the method to use for the metadata 3 types
  //  api use a field from the USGS metadata xml
  //  api_browse use a field from the USGS metadata browse (thumbnails) xml
  //  constant use a defined value.  the value to use will be in the fieldName
  const method = field_config.method
  var record_field

  //if the method is api_browse then get the thumbnail for
  if( method === 'api_browse'){
    record_field = get_browse_url_fieldset(
      scene_metadata.scene.browseLinks,
      databaseFieldName,
      configFieldName
    )
  } // api_browse method

  if( method === 'api') {
    var metadata_field = scene_metadata.scene.metadataFields[0].metadataField
      .filter((metadata_field) => {
        const field_name = metadata_field.data.name
        return field_name === field_config.fieldName
      })

    if (!metadata_field.length) {
      var err = new Error(''
        +'Metadata field filter returned an empty list '
        +'while trying to process the field '+field_config.fieldName+'. '
        +'This may be because a fieldName in metadata.yaml is not '
        +'identical to the actual field name in the USGS metadata.'
      )
      logger.log(logger.LEVEL_ERROR, err.stack)
      return
    }

    record_field = get_api_fieldset(
      metadata_field,
      configFieldName,
      databaseFieldName
    )

  } //api method

  //method type constant
  if( method === 'constant'){
    record_field = get_constant_fieldset(configFieldName, databaseFieldName)

  } //constant method

  return record_field

}

/**
 * Add a list of records to the database
 *
 */
function update_db(records) {
  logger.log(
    logger.LEVEL_INFO,
    'START inserting ' + records.length + ' records into metadata table'
  )
  records.forEach(record => {
    update_lsf_database.metadata_to_db(record)
  })
}




// Helpers

//limit data from json object
function limit_json (json, limit_keys, limit_value){
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


//return child filter aray

// needs a json object of fields to limit another json object of metadata fields returned from
//  the USGS api
function get_child_filters (fields_json, dataset_fields){

  // instiate a blank array
  var array = []

  //walk through all te
  fields_json.forEach( (field) => {

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
//  this field set will be combined to create a metadata record for insertion
//  into the Landsat Fact Database
//    this function is for creating a the field set when the value is defined
//    by the USGS API
function get_api_fieldset (metadata_field, configFieldName, databaseFieldName){
  var name = databaseFieldName
  const rawFieldValue = metadata_field[0].metadataValue[0].value
  const value = fix_data_type_l1_vals(databaseFieldName, rawFieldValue)

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
function get_constant_fieldset (configFieldName, databaseFieldName){
  const name = databaseFieldName
  const value = configFieldName

  return {
    name,
    value
  }
}


//returns a field name and field value object for a metadata field
//  this field set will be combined to create a metada record for insertion
//  into the Landsat Fact Datbase
//    this function is for creating a the field set when the value is defined
//    by the USGS API in the browse element.  this element holds all the thumbnail images
//    of the scene
function get_browse_url_fieldset (browse_json, databaseFieldName, configFieldName){

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

      if (id === 'BROWSE_REFL_WMS_PATH' || id === 'BROWSE_REFLECTIVE_PATH') {
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


//make child filter json object
function make_child_filter (filterType, fieldId, firstValue, secondValue){
  return {
    filterType,
    fieldId,
    firstValue,
    secondValue
  }
}

//make additionalCriteria filter json object
function make_additionalCriteria_filter (filterType, childFilters){
  return {
    filterType,
    childFilters
  }
}

//get a date from n (days_ago) days
function get_start_date (days_ago){
  return new Date(new Date().setDate(new Date().getDate() - days_ago))
}


//fix data_type_l1
//  the data_type_l1 metadata field has too many characters that are not used by the
//  Landsat fact database. in these cases we must make sure the chartacter limit of 5
//  characters will not fail to insert into the database so we strip out characters that are not needed.
//  from visual inspeaction this happens when the + charater has text before it.  any charaters
//    before the + character is not needed for our use case so we strip it out.
function fix_data_type_l1_vals (databaseFieldName, fieldValue){

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


function filter_scene_metadata (fields_config, scene_metadata) {
  var relevant_fields = scene_metadata.scene.metadataFields[0].metadataField
    .filter((metadata_field) => {
      const field_name = metadata_field.data.name
      return fields_config
        .filter(config_field => {
          // if it is not an api method then keep it regardless
          return config_field.field[0].method !== 'api' ||
                 field_name === config_field.field[0].fieldName
        })
        .length > 0
    })
  scene_metadata.scene.metadataFields[0].metadataField = relevant_fields
  return scene_metadata
}


