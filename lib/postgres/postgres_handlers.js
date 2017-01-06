var pg = require('pg');
var winston = require('winston');

var apphelpers = require('../helpers/app_helpers.js')
var APP_HELPERS = apphelpers();

//get todays data as string
today = APP_HELPERS.get_date_string();
name = "postgres_handlers"
logger_file = 'logs/' + name + '-' + today + '.log'


var logger = new (winston.Logger)({
        transports: [
          new (winston.transports.File)({ filename: logger_file})
        ]
      });


logger.level = 'debug';

module.exports = {



    //connect to database and return the client object
    pg_pool: function(connection_obj){

      var pg_client = new pg.Pool(connection_obj)

        pg_client.on('error', function (err, client) {
          // if an error is encountered by a client while it sits idle in the pool
          // the pool itself will emit an error event with both the error and
          // the client which emitted the original error
          // this is a rare occurrence but can happen if there is a network partition
          // between your application and the database, the database restarts, etc.
          // and so you might want to handle it and at least log it out
          console.error('idle Client Error %s', err.message)
          logger.log('error', "Client Error: %s", err.message);

        })
       return pg_client;
    },

    //generic query generator
    pool_query_db: function(pg_pool, query_text, query_params, callback) {


      // to run a query we can acquire a client from the pool,
      // run a query on the client, and then return the client to the pool
      pg_pool.connect(function(err, client, done) {
        if(err) {
          logger.log('error', 'error fetching client from pool: ' + err.message);
          return console.error('error fetching client from pool', err.message);
        }

        client.query(query_text, query_params, function(err, result) {
          //call `done()` to release the client back to the pool
          done();

          //error checking
          if(err) {
            //capture error for duplicate scene_ids in metadata table since this will happen a lot we want to be verbose
            if(err.code === '23505'){
              logger.log('error', 'error running query: ' + err.detail  + ' This happend while inserting data into the table ' + err.table + '.  The unique rule is defined by the constraint ' + err.constraint);
              return console.error('error running query: ', err.detail  + ' This happend while inserting data into the table ' + err.table + '.  The unique rule is defined by the constraint ' + err.constraint);
            //all other errors just use the default
            } else {
              logger.log('error', 'error running query: ' + err.message);
              return console.error('error running query:', err.message);
            }
          }

          //normal query completed successfully
          logger.log('info', 'Query completed successfully: for ' + result.command  + ' and returned ' + result.rowCount + ' row(s)' );
          console.log('Query completed successfully: for ' + result.command  + ' and returned ' + result.rowCount + ' row(s)' )

          if (callback !== undefined) { callback(result) }
        });
      });


    },

  //connect to database and return the client object
  pg_connect: function(connection_obj){

    //get todays data as string
    today = APP_HELPERS.get_date_string();
    name = "postgres_handlers"

    //delete old logs
    APP_HELPERS.delete_old_files(name, 'logs/', '.log');

    var pg_client = new pg.Client(connection_obj)
        .on('drain', this.pg_clientDrain)
        .on('error', this.pg_clientError)
        .on('end', this.pg_clientEnd);

     pg_client.connect(this.pg_connectionError);

     return pg_client;
  },

  //generic error callback for client, connecting
  pg_clientError: function (err) {
      'use strict';
      if (err) {
          // console.error("Client Error: %s", err);
          logger.log('error', "Client Error: %s", err);
      }
      return err;
  },

  //generic error callback for client, connecting
  pg_connectionError: function(err) {
      'use strict';
      if (err) {
        // console.error("Connection Error: %s", err);
        logger.log('error', "Connection Error: %s", err);
      }
      return err;
  },

  //data test drain callback when all maintenace queries finish
  pg_clientDrain: function() {
    'use strict';
    // console.log('client drain');
    this.end();
  },


  //when client ends
  pg_clientEnd: function(result) {
      'use strict';
      // console.log('client end');
      return result;
  },

  //generic error callback for client,queries
  pg_queryError: function (err) {
      'use strict';
      if (err) {
          // console.error("Query Error: %s", err);
          logger.log('error', "Query Error: %s", err);
      };
      return err;
  },

  //generic query on row method.
  pg_queryRow: function(row, result) {
    'use strict';
    //console.log(row);
    return row;
  },


  //generic query end callback
  pg_queryEnd: function(result) {
      'use strict';

      //no rows returned
      if (result.rowCount === 0) {
        //console.log("no row(s) returned.")
        logger.log('info', "no row(s) returned.");
      } else {
        // console.log(result.rowCount.toString() + " row(s) returned.")
        logger.log('info', result.rowCount.toString() + " row(s) returned.");

      }

      return result;
  },

  //generic query generator
  query_db: function(pg_client, query_text, parameters){
    pg_client.query(query_text, parameters)
        .on('error', this.pg_queryError)
        .on('row', this.pg_queryRow)
        .on('end', this.pg_queryEnd);
  },


};
