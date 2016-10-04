var pg = require('pg');
var yaml = require('yamljs');
var PG_HANDLER = require('./postgres_handlers.js')
var winston = require('winston');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({ filename: 'logs/update_lsf_database.log'})
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

const pg_client = PG_HANDLER.pg_connect(PG_CONNECT)

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
  console.log(insert_sql)
  console.log(field_parameters)

   PG_HANDLER.query_db(pg_client, insert_sql, field_parameters);
 },

 update_metadata: function(key, field_set){
   const field_parameters = this.get_metadata_parameters(field_set);

   field_set.map( field => {
     //console.log("UPDATE landsat_metadata SET " + field.name + " = ''" + field.value + "' WHERE scene_id = '" + key + "';");
   })
 },


 check_metadata_exists: function(field_set){

   const val = field_set[0].value;
   var self = this;
   console.log('in check_metadata_exists: ' + val )
   var query = pg_client.query("SELECT count(*)::int AS count FROM landsat_metadata WHERE scene_id = $1::text",[val]);

   //query to check for duplicate scenes
   query.on('row', function(row) {
     console.log('row in check_metadata_exists rows:' + row.count  )
     //id exists do update instead
     if (row.count > 0){
       logger.log('error', 'Insert failure: The scene_id ' + val + ' already exists');

       return true;
    } else {
      //id does not exist
      console.log('row count 0 in check_metadata_exists')
      logger.log('error', 'Insert success: Metadata for the scene_id ' + val + ' succeeded!');
      logger.log('info', 'inserted success - ' + row.count);
      logger.log('debug', 'inserted' , field_set );
      self.insert_metadata(field_set);
      return false
    }
    //id does not exist

     //id does not exist
    //  } else if (row.count === 0){
    //     console.log('row count 0 in check_metadata_exists')
    //     logger.log('error', 'Insert success: Metadata for the scene_id ' + val + ' succeeded!');
    //     logger.log('info', 'inserted success - ' + row.count);
    //     logger.log('debug', 'inserted' , field_set );
    //     self.insert_metadata(field_set);
    //     return false
    //  //something else is true just do nothing
    //  } else {
    //    console.log('else in check_metadata_exists')
    //    logger.log('info', 'inserted failed - ' + row.count);
    //    return false;
    //  }
   });

   query.on('error', function(err) {
    //  console.error(err);
    console.log('error in check_metadata_exists')
     logger.log('error', 'Query Error: ' + err);

   });

   query.on('end', function(result) {
     console.log('end in check_metadata_exists')

     //do nothing
   });


 },


 metadata_to_db: function(field_set){

   const valid = this.metadata_fieldcheck(field_set);
   if(valid){
     console.log('valid')
     console.log(field_set);
     this.check_metadata_exists(field_set);
   } else {
     console.error('Your input data is not valid!');
     logger.log('error', 'data error: Your input data is not valid!');
     return
   }


 },

}
