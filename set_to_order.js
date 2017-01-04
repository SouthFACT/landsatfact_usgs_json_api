/**
 * Sets records in the metadata table to be 'ordered'
 * for download if they are not available for download from USGS.
 *
 */

// Libraries
var yaml = require('yamljs');
var pg = require('pg');
var fs = require('fs');
var winston = require('winston');
var axios = require('axios');
var Promise = require('bluebird')
Promise.longStackTraces()

// Modules
var usgs_constants = require("./lib/usgs_api/usgs_constants.js");
var usgs_functions = require("./lib/usgs_api/usgs_functions.js");
var usgs_helper = require("./lib/usgs_api/usgs_helpers.js");
var pg_handler = require('./lib/postgres/postgres_handlers.js')
var app_helpers = require('./lib/helpers/app_helpers.js')()

// Database connection
const db_config = yaml.load("./lib/postgres/config.yaml");

// Constants for USGS API Calls
const node = usgs_constants.NODE_EE;
const downloadCode = "STANDARD"
const dl_options_code = usgs_helper.get_usgs_response_code('downloadoptions');
const SCENE_LIST_LIMIT = 10000


axios.defaults.baseURL = usgs_constants.USGS_URL;

var get_api_key = usgs_helper.get_api_key();

var pg_pool = pg_handler.pg_pool(db_config)

//////////////////////////////////////

const main = function () {
  // TODO: PUT QUERY TEXT SOMEWHERE ELSE?
  const query_text = "SELECT * FROM landsat_metadata LIMIT 15000"

  pg_handler.pool_query_db(pg_pool, query_text, [], function(query_result) {
    sort_records_by_dataset(query_result).then(function(scenes_by_dataset) {
      var dataset_names = Object.keys(scenes_by_dataset)
      process_scenes(scenes_by_dataset, dataset_names)
    })
  })

}

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
    console.log('sort rows by dataset done')
    return scenes_by_dataset
  })
}

const process_scenes = function (scenes_by_dataset, dataset_names) {
  return Promise.resolve().then(function () {
    const dataset_name = dataset_names.pop()
    const scene_batch = scenes_by_dataset[dataset_name]
    return process_scenes_for_dataset(scene_batch, dataset_name)
  }).then(function () {
    if (dataset_names.length) {
      return process_scenes(scenes_by_dataset, dataset_names)
    }
    console.log('completed processing all datasets')
  })
}

const process_scenes_for_dataset = function (scenes, dataset_name) {
  return Promise.resolve().then(function () {
    if (scenes.length) {
      var scene_batch = scenes.slice(0, SCENE_LIST_LIMIT)
      return process_scene_batch(scene_batch, dataset_name)
    }
  }).then(function () {
    var next_scene_batch = scenes.slice(SCENE_LIST_LIMIT)
    if (next_scene_batch.length) {
      return process_scenes_for_dataset(next_scene_batch, dataset_name)
    }
    console.log('completed processing dataset ', dataset_name)
  })
}

const process_scene_batch = function(scenes, dataset_name) {
  return get_dl_options_for_scene_batch(scenes, dataset_name).then(function (response) {
    return sort_options_by_avail(response).then(function(scenes_by_avail) {
      return update_records_by_avail(scenes_by_avail)
    })
    .catch(function (err) { console.log('error sorting by availibility', err.stack) })
  })
  .catch(function (err) { console.log('error getting dl options', err.stack) })
}

const get_dl_options_for_scene_batch = function(scenes, dataset_name) {
  return get_api_key.then(function (apiKey) {
    console.log('begin processing scene batch for dataset ', dataset_name)
    const request_body = usgs_functions.usgsapi_downloadoptions(apiKey, node, dataset_name, scenes);
    return usgs_helper.get_usgsapi_response(dl_options_code, request_body)
      .catch(function(err) {
        console.log('Error during DownloadOptions USGS API request: ', err.stack)
      })
      .then(function(response) {
        console.log('got dl options for ', dataset_name, 'dataset')

        return response
      })
  })

}

/**
 * Filters the response of a download options request by download availability
 *
 * @param response (json) is the result of a download_options request to the USGS API.
 *  [
 *    {
 *      downloadOptions: [
 *        {
 *          avail: <Boolean>
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
const sort_options_by_avail = (response) => {

  // Mark needs_ordering field as YES if available for download (available is true),
  //   NO if not available for download
  return Promise.resolve().then(function () {
    var avail = []
    var unavail = [] 

    response.forEach((obj) => {
      var standard_option = obj['downloadOptions'].filter((option) => {
        return option.downloadCode === 'STANDARD'
      })
      if (standard_option.length) {
        if (standard_option[0].avail) {
          avail.push(obj.entityId)
        }
        else {
          unavail.push(obj.entityId)
        }
      }
    })

    console.log('options sorted')

    return { 'available': avail, 'unavailable': unavail }
  })


}

const update_records_by_avail = function (scenes_by_avail) {
  return update_records_by_avail_aux(scenes_by_avail.available, 'NO').then(function () {
    return update_records_by_avail_aux(scenes_by_avail.unavailable, 'YES')
  })
}

const update_records_by_avail_aux = function (scenes, field_text) {
  return Promise.resolve().then(function () {
    if (scenes.length) {
      sql_list = app_helpers.list_array_to_sql_list(scenes)
      var query_text = build_update_query(sql_list, field_text)
      pg_handler.pool_query_db(pg_pool, query_text, [])
    }
  })
}

const build_update_query = function (scenes, needs_ordering_text) {
  return "UPDATE landsat_metadata SET needs_ordering = "
          + "'"+needs_ordering_text+"'"
          + ' WHERE scene_id IN '
          + scenes
}


main()

