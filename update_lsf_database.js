var pg = require('pg');
var yaml = require('yamljs');


var pg_client;

// extend array type to check for matching.
Array.prototype.compare = function(testArr) {
    if (this.length != testArr.length) {
      console.error('Error the number of fields do not match.  You should have ' + this.length.toString() + ' fields but only have ' + testArr.length.toString() + ' fields.');
      return false
    };
    for (var i = 0; i < testArr.length; i++) {
        if (this[i].compare) { //To test values in nested arrays
            if (!this[i].compare(testArr[i])) {
              return false};
            }
        else if (this[i] !== testArr[i]) {
          console.error( 'your data does not contain the field ' + this[i] + ' in position ' + (i + 1).toString());
          return false
        };
    }
    return true;
}


//get config data
const CONFIG_YAML = yaml.load("./config.yaml");
const PG_CONNECT = CONFIG_YAML.postgres[0];

//generic error callback for client, connecting
var pg_clientError = function (err) {
    'use strict';
    if (err) {
        console.error("Client Error: %s", err);
    }
    return err;
};

//generic error callback for client, connecting
var pg_connectionError = function (err) {
    'use strict';
    if (err) {
      console.error("Connection Error: %s", err);
    }
    return err;
};

//data test drain callback when all maintenace queries finish
var pg_clientDrain = function () {
  'use strict';
  console.log('client drain');
  pg_client.end();
};


//when client ends
var pg_clientEnd = function (result) {
    'use strict';
    console.log('client end');
    return result;
};


//generic error callback for client,queries
var pg_queryError = function (err) {
    'use strict';
    if (err) {
        console.error("Query Error: %s", err);
    };
    return err;
};


//generic query on row method.
var pg_queryRow = function (row, result) {
  'use strict';
  //console.log(row);
  return row;
};


//generic query end callback
var pg_queryEnd = function (result) {
    'use strict';

    //no rows returned
    if (result.rowCount === 0) {
      console.log("no row(s) returned.")
    } else {
      console.log(result.rowCount.toString() + " row(s) returned.")
    }

    return result;
};

//open client and connection for Buidling Buffers
pg_client = new pg.Client(PG_CONNECT)
    .on('drain', pg_clientDrain)
    .on('error', pg_clientError)
    .on('end', pg_clientEnd);



const  lsf_query = "select * from landsat_metadata where scene_id = 'LC80290352016250LGN00'";
//connect
pg_client.connect(pg_connectionError);

// const PG_HOST = PG_CONNECT[0].host;
// const PG_DATABASE = PG_CONNECT[0].database;
// const PG_USER = PG_CONNECT[0].user;
// const PG_PASSWORD = PG_CONNECT[0].password;
// const PG_PORT = PG_CONNECT[0].port;


module.exports = {

  //generic query generator
  query_db: function(query_text, parameters){
    pg_client.query(query_text, parameters)
        .on('error', pg_queryError)
        .on('row', pg_queryRow)
        .on('end', pg_queryEnd);
  },

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


   this.query_db(insert_sql, field_parameters);
 },

 update_metadata: function(key, field_set){
   const field_parameters = this.get_metadata_parameters(field_set);

   field_set.map( field => {
     console.log("UPDATE landsat_metadata SET " + field.name + " = ''" + field.value + "' WHERE scene_id = '" + key + "';");
   })
 },


 check_metadata_exists: function(field_set){

   const val = field_set[0].value;
   var exists = true;
   var self = this;

   var query = pg_client.query("SELECT count(*)::int AS count FROM landsat_metadata WHERE scene_id = $1::text",[val]);

   //query to check for duplicate scenes
   query.on('row', function(row) {
     //id exists do update instead
     if (row.count > 0){
       console.log('The scene_id ' + val + ' already exists' );
       return true;
     //id does not exist
     } else if (row.count === 0){
        console.log(row.count);
        self.insert_metadata(field_set);
        return false
     //something else is true just do nothing
     } else {
       return false;
     }
   });

   query.on('error', function(err) {
     console.error(err);
   });

   query.on('end', function(result) {
     //do nothing
   });


 },


 metadata_to_db: function(field_set){


   const valid = this.metadata_fieldcheck(field_set);
   if(valid){
     this.check_metadata_exists(field_set);
   } else {
     console.error('Your input data is not valid!');
     return
   }


 },

}
