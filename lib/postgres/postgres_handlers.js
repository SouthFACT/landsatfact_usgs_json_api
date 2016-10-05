var pg = require('pg');
var winston = require('winston');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.File)({ filename: 'logs/postgres_handlers.log'})
  ]
});

logger.level = 'debug';

module.exports = {

  //connect to database and return the client object
  pg_connect: function(connection_obj){

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
    // this.end(); 
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
      console.error("Query Error: %s", err);

      if (err) {
          console.error("Query Error: %s", err);
          logger.log('error', "Query Error: %s", err);
      };
      return err;
  },

  //generic query on row method.
  pg_queryRow: function(row, result) {
    'use strict';
    console.error("Query end: %s", row);
    return row;
  },


  //generic query end callback
  pg_queryEnd: function(result) {
      'use strict';
      console.error("Query end: %s", result);

      //no rows returned
      if (result.rowCount === 0) {
        console.log("no row(s) returned.")
        logger.log('info', "no row(s) returned.");
      } else {
        console.log(result.rowCount.toString() + " row(s) returned.")
        logger.log('info', result.rowCount.toString() + " row(s) returned.");

      }

      return result;
  },

  //generic query generator
  query_db: function(pg_client, query_text, parameters){

    console.log('---postgres handler---')
    console.log(query_text)
    console.log(parameters)
    console.log('---postgres handler---')

    pg_client.query(query_text, parameters)
        .on('row', this.pg_queryRow)
        .on('end', this.pg_queryEnd)
        .on('error', this.pg_queryError)


  },


};
