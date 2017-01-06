/**
 * Sets records in the metadata table to be 'ordered'
 * for download if they are not available for download from USGS.
 * 
 */

// Libraries
var yaml = require('yamljs')
var pg = require('pg')
var fs = require('fs')
var winston = require('winston')
var axios = require('axios')
var Promise = require('bluebird')
Promise.longStackTraces()

// Modules
var usgs_constants = require("./lib/usgs_api/usgs_constants.js")
var usgs_functions = require("./lib/usgs_api/usgs_functions.js")
var usgs_helper = require("./lib/usgs_api/usgs_helpers.js")
var pg_handler = require('./lib/postgres/postgres_handlers.js')
var app_helpers = require('./lib/helpers/app_helpers.js')()

// Constants for handling USGS API
const DL_OPTION_DOWNLOAD_CODE = "STANDARD"
const DL_OPTIONS_USGS_RESPONSE_CODE = usgs_helper.get_usgs_response_code('downloadoptions')
const MAX_DL_OPTIONS_REQUEST_ATTEMPTS = 5

// Maximum scene list size for a single downloadoptions request
const SCENE_BATCH_LIMIT = 10000

// Base URL for http promise library
axios.defaults.baseURL = usgs_constants.USGS_URL

// USGS API key promise
var get_api_key = usgs_helper.get_api_key()

// Database connection
const db_config = yaml.load("./lib/postgres/config.yaml")
var pg_pool = pg_handler.pg_pool(db_config)

// Logging
const TODAY_DATE = app_helpers.get_date_string()
const LOG_LEVEL_INFO = 'info'
const LOG_LEVEL_ERROR = 'error'
const LOG_FILE = 'update_scenes_to_order_' + TODAY_DATE

app_helpers.delete_old_files(LOG_FILE, 'logs/', '.log')
app_helpers.set_logger_level('debug')
app_helpers.set_logfile(LOG_FILE)
app_helpers.write_message(LOG_LEVEL_INFO, 'START '+LOG_FILE, '')

// Initial SELECT query
const query_text = "SELECT * FROM landsat_metadata WHERE needs_ordering IS null"


//////////////////////////////////////////////////////////////////////////////////

/**
 * Main function. Pulls relevant records from the metadata table to be processed,
 * then initiates the processing logic for the query result.
 *
 */
const main = function () {

  pg_handler.pool_query_db(pg_pool, query_text, [], function(query_result) {
    sort_records_by_dataset(query_result).then(function(scenes_by_dataset) {
      var dataset_names = Object.keys(scenes_by_dataset)
      process_scenes(scenes_by_dataset, dataset_names)
    })
  })

}


/**
 * Sort scene records by which dataset they belong to.
 * 
 * @param query_result is a list of records (scenes) from the metadata table.
 *
 * @return an object: keys are dataset names, values are lists of scene ids.
 *
 */
const sort_records_by_dataset = function(query_result) {
  return Promise.resolve().then(function() {
    var scenes_by_dataset = {
      LANDSAT_8: [],
      LANDSAT_ETM_SLC_OFF: [],
      LANDSAT_ETM: [],
      LANDSAT_TM: []
    }
    query_result.rows.forEach(function(row) {
      const row_dataset = usgs_helper.get_datasetName(row.scene_id, row.acquisition_date)
      scenes_by_dataset[row_dataset].push(row.scene_id)
    })
    app_helpers.write_message(LOG_LEVEL_INFO, 'COMPLETED sorting rows by dataset', '')
    return scenes_by_dataset
  })
}


/**
 * Process scenes for each landsat dataset.
 *
 * We separate scenes by dataset because the DownloadOptions API request
 * requires all scenes being checked to be of the same dataset
 *
 * @param scenes_by_dataset is the object returned by sort_records_by_dataset
 * @param dataset_names is a list containing the names of each dataset
 *
 */
const process_scenes = function (scenes_by_dataset, dataset_names) {
  return Promise.resolve().then(function () {
    const dataset_name = dataset_names.pop()
    const dataset_scenes = scenes_by_dataset[dataset_name]
    return process_scenes_for_dataset(dataset_scenes, dataset_name)
  }).then(function () {
    if (dataset_names.length) {
      return process_scenes(scenes_by_dataset, dataset_names)
    } else {
      app_helpers.write_message(LOG_LEVEL_INFO, 'COMPLETED processing all scenes', '')
    }
  })
}

/**
 * Process the scenes for a single landsat dataset.
 *
 * This is done in batches since the maximum number of scenes
 * a single DownloadOptions request allows is 50000.
 *
 * @param scenes is a list of scene ids all from the same landsat dataset
 * @param dataset_name is the name of the landsat dataset being processed
 *
 */
const process_scenes_for_dataset = function (scenes, dataset_name) {
  return Promise.resolve().then(function () {
    if (scenes && scenes.length > 0) {
      var scene_batch = scenes.slice(0, SCENE_BATCH_LIMIT)
      return process_scene_batch(scene_batch, dataset_name)
    }
  }).then(function () {
    var next_scene_batch = scenes.slice(SCENE_BATCH_LIMIT)
    if (next_scene_batch.length) {
      return process_scenes_for_dataset(next_scene_batch, dataset_name)
    }
    else {
      app_helpers.write_message(
        LOG_LEVEL_INFO,
        'COMPLETED processing dataset',
        dataset_name
      )
    }
  })
}

const process_scene_batch = function (scenes, dataset_name) {
  return get_dl_options_for_scene_batch(scenes, dataset_name).then(function (response) {
    if (response) {
      return sort_options_by_avail(response).then(function(scenes_by_avail) {
        return update_records(scenes_by_avail)
      })
    }
  })
}


/**
 * Get the download availability for a batch of scenes.
 * 
 * @return the response of the DownloadOptions API call to USGS.
 */
const get_dl_options_for_scene_batch = function (scenes, dataset_name, num_attempts) {
  return get_api_key.then(function (apiKey) {
    app_helpers.write_message(
      LOG_LEVEL_INFO,
      'START processing scene batch of size '+scenes.length+' for dataset ',
      dataset_name
    )

    num_attempts = num_attempts || 1
    const request_body = usgs_functions.usgsapi_downloadoptions(apiKey, usgs_constants.NODE_EE, dataset_name, scenes)
    return usgs_helper.get_usgsapi_response(DL_OPTIONS_USGS_RESPONSE_CODE, request_body)
      .catch(function(err) {
        return handle_usgs_dl_options_response_error(err, scenes, dataset_name, num_attempts)
      })
      .then(function(response) {
        return process_usgs_dl_options_response(response, dataset_name)
      })

  })
  .catch(function (err) {
    app_helpers.write_message(
      LOG_LEVEL_ERROR,
      'ERROR obtaining USGS API key',
      err.stack
    )
  })

}

/**
 * Processes the response of a usgs downloadopotions request.
 *
 */
const process_usgs_dl_options_response = function (response, dataset_name) {
  if (response) {
    app_helpers.write_message(
      LOG_LEVEL_INFO,
      'COMPLETED get download options for scene batch of dataset',
      dataset_name
    )
    if (response.length) {
      return response
    }
    else {
      app_helpers.write_message(
        LOG_LEVEL_INFO,
        'No download options returned for scene batch in dataset',
        dataset_name
      )
    }
  }
  else {
    app_helpers.write_message(
      LOG_LEVEL_ERROR,
      'No response data from downloadoptions request'
    )
  }
}

/**
 * Handle errors returned by a usgs downloadoptions request.
 * Initiates another request if we get a simultaenous requests error
 * (up to a certain number of attempts)
 *
 */
const handle_usgs_dl_options_response_error = function (err, scenes, dataset_name, num_attempts) {
  return Promise.resolve().then(function () {
    app_helpers.write_message(
      LOG_LEVEL_ERROR,
      'ERROR on downloadoptions request',
      err.stack
    )
    if (err.message.indexOf('Rate limit exceeded') >= 0 && num_attempts < MAX_DL_OPTIONS_REQUEST_ATTEMPTS) {
      return get_dl_options_for_scene_batch(scenes, dataset_name, ++num_attempts)
    }    
  })
}


/**
 * Sort scenes by download availability
 *
 * @param response is the result of a DownloadOptions request to the USGS API.
 *  [
 *    // A single scene
 *    {
 *      downloadOptions: [
 *        {
 *          available: <Boolean>
 *          downloadCode: <String>
 *          filesize: <Number>
 *          productName: <String>
 *          url: <String>
 *          storageLocation: <String>
 *        },
 *        ...
 *      ],
 *      entityId: <String>
 *    },
 *    ...
 *  ]
 *
 * @return an object with two lists: available and unavailable sceneIds
 *
 */
const sort_options_by_avail = function (response) {

  // Mark needs_ordering field as YES if available for download (available is true),
  //   NO if not available for download
  return Promise.resolve().then(function () {
    var avail = []
    var unavail = [] 

    response.forEach((obj) => {
      var standard_option = obj['downloadOptions'].filter((option) => {
        return option['downloadCode'] === 'STANDARD'
      })
      if (standard_option.length) {
        if (standard_option[0].available) {
          avail.push(obj.entityId)
        }
        else {
          unavail.push(obj.entityId)
        }
      } else {
        app_helpers.write_message(
          LOG_LEVEL_ERROR, 
          'ERROR no download option for '
        );

      }
    })
    
    return { 'available': avail, 'unavailable': unavail }
  })
  .catch(function (err) {
    app_helpers.write_message(
      LOG_LEVEL_ERROR,
      'ERROR sorting downloadoptions response by download availability',
      err.stack
    )
  })

}


/**
 * Update database records for scenes based on download availability
 * 
 * @param scenes_by_avail an object with keys 'available' and 'unavailable'
 * with lists of scene ids for each field.
 */
const update_records = function (scenes_by_avail) {
  return update_records_by_availability(scenes_by_avail.available, 'NO').then(function () {
    return update_records_by_availability(scenes_by_avail.unavailable, 'YES')
  })
}
const update_records_by_availability = function (scenes, field_text) {
  return Promise.resolve().then(function () {
    if (scenes.length) {
      sql_list = app_helpers.list_array_to_sql_list(scenes)
      var query_text = build_update_query(sql_list, field_text)
      pg_handler.pool_query_db(pg_pool, query_text, [])
    }
  }).catch(function (err) {
    app_helpers.write_message(
      LOG_LEVEL_ERROR, 
      'ERROR updating scene records',
      err.stack
    );

  })
}


/**
 * Build a query to update the records for a batch of scenes.
 *
 */
const build_update_query = function (scenes, needs_ordering_text) {
  const download_available_text = needs_ordering_text === 'NO' ? 'YES' : 'NO'
  return "UPDATE landsat_metadata SET needs_ordering = "
          + "'"+needs_ordering_text+"', "
          + "download_available = "
          + "'"+download_available_text+"' "
          + "WHERE scene_id IN "
          + scenes
}


module.exports = {
  sort_records_by_dataset,
  process_scenes_for_dataset,
  process_scene_batch,
  get_dl_options_for_scene_batch,
  process_usgs_dl_options_response,
  handle_usgs_dl_options_response_error,
  sort_options_by_avail,
  update_records,
  update_records_by_availability,
}


main()

