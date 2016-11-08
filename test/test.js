var assert = require('assert');
var expect  = require("chai").expect;
var should = require('chai').should();


//get modules
var USGS_CONSTANT = require("../lib/usgs_api/usgs_constants.js");
var USGS_FUNCTION = require("../lib/usgs_api/usgs_functions.js");
var USGS_HELPER = require("../lib/usgs_api/usgs_helpers.js");
var PG_HANDLER = require('../lib/postgres/postgres_handlers.js')


describe('USGS API TESTS', function() {
  describe('', function() {
    it('USGS api should return an api key', function(done) {

      const testPromise = USGS_HELPER.get_api_key();
      testPromise.then(function(result){
          try {


              expect(result).to.have.length.of.at.least(5);

              done();
          } catch(err) {
              done(err);
          }
      }, done);

    });
  });
});
