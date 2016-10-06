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
  query_db: function(pg_client, query_text, parameters, scene){


    // to run a query we can acquire a client from the pool,
    // run a query on the client, and then return the client to the pool
    pg_client.connect(function(err, client, done) {
      if(err) {
        logger.log('error', 'error fetching client from pool: ' + err.message);
        return console.error('error fetching client from pool', err.message);
      }
      client.query(query_text, parameters, function(err, result) {
        //call `done()` to release the client back to the pool
        done();

        if(err) {
          console.log(err.detail)

          if(err.code === '23505'){
            logger.log('error', 'error running query: ' + err.detail  + ' This happend while inserting data into the table ' + err.table + '.  The unique rule is defined by the constraint ' + err.constraint);
            return console.error('error running query: ', err.detail  + ' This happend while inserting data into the table ' + err.table + '.  The unique rule is defined by the constraint ' + err.constraint);
          } else {
            logger.log('error', 'error running query: ' + err.message);
            return console.error('error running query:', err.message);
          }
        }

        console.log('Inserted new record for scene: ' + scene.value + '!')
        logger.log('info', 'Inserted new record for scene: ' + scene.value + '!');

      });
    });


  },



};
