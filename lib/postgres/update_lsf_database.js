var pg = require('pg')
var yaml = require('yamljs')
var PG_HANDLER = require('./postgres_handlers.js')
var winston = require('winston')

var logger = require.main.exports.logger

var app_helpers = require('../helpers/app_helpers.js')()

//get config data
const db_config = app_helpers.get_db_config()
const pg_pool = PG_HANDLER.pg_pool(db_config)

if (!logger) {
  var log_file = 'update_lsf_database'
  var logger = require('../helpers/logger.js')(log_file)
}

module.exports = {

  /**
  creates the parameters for inserting sql
    this is the list of values. in an object which must contain the databaseFieldName and the value but we only use the value
    this should have 13 values

  example record set object
  [ { name: 'scene_id', value: 'LC80280352016243LGN00' },
  { name: 'landsat_product_id', value: 'LC08_L1TP_029035_20160430_20170501_01_RT },
    { name: 'sensor', value: 'OLI_TIRS' },
    { name: 'acquisition_date', value: '2016/08/30' },
    { name: 'browse_url',
      value: 'http://earthexplorer.usgs.gov/browse/landsat_8/2016/028/035/LC80280352016243LGN00.jpg' },
    { nam: 'path', value: ' 028' },
    { name: 'row', value: ' 035' },
    { name: 'cc_full', value: '27.23' },
    { name: 'cc_quad_ul', value: 0 },
    { name: 'cc_quad_ur', value: 0 },
    { name: 'cc_quad_ll', value: 0 },
    { name: 'cc_quad_lr', value: 0 },
    { name: 'data_type_l1', value: 'L1T' } ]
  */
  get_metadata_parameters: function (field_set) {

    //instiate parameter arrays
    var fields = []

    //build paramters for SQL insert
    field_set.map( field => {
      fields.push(field.value)
    })

    return fields
  },

  //delete old logs
  delete_update_logs: function() {
    //get todays data as string
    today = app_helpers.get_date_string()
    name = "update_lsf_database"
    logger_file = 'logs/' + name + '-' + today + '.log'

    app_helpers.delete_old_files(name, 'logs/', '.log')
  },
  //creates an array of field names from the USGS api so we can compare for validity
  get_metadata_fieldName: function (field_set) {

    //instiate parameter arrays
    var fields = []

    //build paramters for SQL insert
    field_set.map( field => {
      fields.push(field.name)
    })

    return fields
  },

  //must be 13 fields and values in the field set and the must me in a certain order for the insert to work properly
  // this function check the order and returns false if the feild se does not have the correct field names, order, or number
  metadata_fieldcheck: function (field_set) {

    //get the fieldnames from api call
    var fields = this.get_metadata_fieldName(field_set)

    const valid = this.is_valid_fieldset(fields)
    return valid
  },

  update_metadata: function (field_set) {
    const field_parameters = this.get_metadata_parameters(field_set)

    //limit to only fields we want to update - " scene_id, browse_url, cc_full, data_type_l1
    var fields = [field_parameters[0],field_parameters[3],field_parameters[6],field_parameters[11]]

    //update missing data
    const update_sql = ""
    +"UPDATE landsat_metadata"
      +" SET browse_url = $2::text, cc_full = $4, data_type_l1 =  substr($5::text,position(' ' in $5::text)+1,5)"
    +" WHERE scene_id = $1::text"

    PG_HANDLER.pool_query_db(pg_pool, update_sql, fields)

  },

  insert_metadata: function (field_set) {
    const field_parameters = this.get_metadata_parameters(field_set)
    const insert_sql = ""
    +"INSERT INTO landsat_metadata("
      +"scene_id, landsat_product_id, sensor, acquisition_date, browse_url, path, row, cc_full, "
      +"cc_quad_ul, cc_quad_ur, cc_quad_ll, cc_quad_lr, data_type_l1, l1_key"
    +") "
    +"VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)"

    //make sure the scene is within the bounds there is no way to do this via usgs api
    // so I am making sure after insert that the new metadata is good via sql query
    const verify_sql = ""
    +"DELETE FROM landsat_metadata WHERE scene_id in "
      +"(SELECT DISTINCT landsat_metadata.scene_id FROM landsat_metadata "
      +"LEFT OUTER JOIN landsat_quads ON "
        +"substr(landsat_metadata.scene_id, 4, 6) = landsat_quads.wrs2_code "
        +"WHERE landsat_quads.wrs2_code IS NULL)"

    PG_HANDLER.pool_query_db(pg_pool, insert_sql, field_parameters)

    PG_HANDLER.pool_query_db(pg_pool, verify_sql, '')

  },

  metadata_to_db: function (field_set) {

   const valid = this.metadata_fieldcheck(field_set)
   if(valid){
    logger.log(logger.LEVEL_INFO,
      'Inserting ' + field_set[0].name + ': ' + field_set[0].value + '.')

    this.insert_metadata(field_set)
    this.update_metadata(field_set)
   }

  },

  update_database_ordered: function (scene_id) {
    const update_sql = "UPDATE landsat_metadata SET ordered = 'YES' WHERE scene_id = '" + scene_id + "'"
    PG_HANDLER.pool_query_db(pg_pool, update_sql, '')
  },

  is_valid_fieldset: function (testArr) {

    //valid metadata fields
    const valid_fields =  [
      'scene_id',
      'landsat_product_id',
      'sensor',
      'acquisition_date',
      'browse_url',
      'path',
      'row',
      'cc_full',
      'cc_quad_ul',
      'cc_quad_ur',
      'cc_quad_ll',
      'cc_quad_lr',
      'data_type_l1',
      'l1_key'
    ]

    if (valid_fields.length != testArr.length) {
      var err = new Error(''
        +'ERROR the number of fields do not match. '
        +'You should have ' + valid_fields.length.toString() + ' '
        +'fields but only have ' + testArr.length.toString() + ' fields.'
      )
      logger.log(
        logger.LEVEL_ERROR,
        err.stack
      )
      return false
    }
    for (var i = 0; i < testArr.length; i++) {
      if (testArr[i] instanceof Array && !is_valid_fieldset(testArr[i])) {
        return false
      }
      else if (valid_fields[i] !== testArr[i]) {
        var err = new Error('ERROR data does not contain the field '
          + valid_fields[i] + ' in position ' + (i + 1).toString()
        )
        logger.log(
          logger.LEVEL_ERROR,
          err.stack
        )
        return false
      }
    }
    return true
  }


}
