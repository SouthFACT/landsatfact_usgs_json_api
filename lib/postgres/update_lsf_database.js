var pg = require('pg');
var yaml = require('yamljs');
var PG_HANDLER = require('./postgres_handlers.js')
var winston = require('winston');

var apphelpers = require('../helpers/app_helpers.js')
var APP_HELPERS = apphelpers();

//get todays data as string
today = APP_HELPERS.get_date_string();
name = "update_lsf_database"
logger_file = 'logs/' + name + '-' + today + '.log'

APP_HELPERS.delete_old_files(name);

var logger = new (winston.Logger)({
        transports: [
          new (winston.transports.File)({ filename: logger_file})
        ]
      });


logger.level = 'debug';

// extend array type to check for matching.
Array.prototype.compare = function(testArr) {
    if (this.length != testArr.length) {
      // console.error('Error the number of fields do not match.  You should have ' + this.length.toString() + ' fields but only have ' + testArr.length.toString() + ' fields.');
      logger.log('error', 'Error the number of fields do not match.  You should have ' + this.length.toString() + ' fields but only have ' + testArr.length.toString() + ' fields.');
      return false
    };
    for (var i = 0; i < testArr.length; i++) {
        if (this[i].compare) { //To test values in nested arrays
            if (!this[i].compare(testArr[i])) {
              return false};
            }
        else if (this[i] !== testArr[i]) {
          // console.error( 'Your data does not contain the field ' + this[i] + ' in position ' + (i + 1).toString());
          logger.log('error', 'Your data does not contain the field ' + this[i] + ' in position ' + (i + 1).toString());
          return false
        };
    }
    return true;
}

//get config data
const PG_CONNECT = yaml.load("./lib/postgres/config.yaml");

const pg_pool = PG_HANDLER.pg_pool(PG_CONNECT)

module.exports = {

/**
creates the parameters for inserting sql
  this is the list of values. in an object which must contain the databaseFieldName and the value but we only use the value
  this should have 13 values

example record set object
[ { name: 'scene_id', value: 'LC80280352016243LGN00' },
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
 get_metadata_parameters: function(field_set){

    //instiate parameter arrays
    var fields = [];

    //build paramters for SQL insert
    field_set.map( field => {
      fields.push(field.value);
    });

    return fields
 },

//creates an array of field names from the USGS api so we can compare for validity
 get_metadata_fieldName: function(field_set){

    //instiate parameter arrays
    var fields = [];

    //build paramters for SQL insert
    field_set.map( field => {
      fields.push(field.name);
    });

    return fields
 },

 //must be 13 fields and values in the field set and the must me in a certain order for the insert to work properly
 // this function check the order and returns false if the feild se does not have the correct field names, order, or number
 metadata_fieldcheck: function(field_set){

   //valid metadata fields
   const valid_fields =  [
                           'scene_id',
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


   //get the fieldnames from api call
   var fields = this.get_metadata_fieldName(field_set);

   const valid = valid_fields.compare(fields);
   return valid;
 },

 insert_metadata: function(field_set){
   const field_parameters = this.get_metadata_parameters(field_set);
   const insert_sql = "INSERT INTO landsat_metadata(scene_id, sensor, acquisition_date, browse_url, path, row, cc_full, cc_quad_ul, cc_quad_ur, cc_quad_ll, cc_quad_lr, data_type_l1, l1_key)" +
                      "VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);";

   PG_HANDLER.pool_query_db(pg_pool, insert_sql, field_parameters, field_set[0]);
 },

 update_metadata: function(key, field_set){
   const field_parameters = this.get_metadata_parameters(field_set);

   field_set.map( field => {

   })
 },


 metadata_to_db: function(field_set){

   const valid = this.metadata_fieldcheck(field_set);
   if(valid){

     this.insert_metadata(field_set);

   } else {
     console.error('Your input data is not valid!');
     logger.log('error', 'data error: Your input data is not valid!');
     return
   }

 },

}
