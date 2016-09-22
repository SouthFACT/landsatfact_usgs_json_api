var axios = require('axios');

var assert = require('assert');
var chai = require('chai');
var expect  = require("chai").expect;
var should = require('chai').should();
chai.use(require('chai-fuzzy'));
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

//get modules
var USGS_CONSTANT = require("../lib/usgs_api/usgs_constants.js");
var USGS_FUNCTION = require("../lib/usgs_api/usgs_functions.js");
var USGS_HELPER = require("../lib/usgs_api/usgs_helpers.js");

//get testjson
const test_datasetfields_request_json = require("../json/test-datasetfields-request.json")
const test_datasetfields_response_json = require("../json/test-datasetfields-response.json")

const test_download_request_json = require("../json/test-download-request.json")

const test_downloadoptions_request_json = require("../json/test-downloadoptions-request.json")
const test_downloadoptions_response_json = require("../json/test-downloadoptions-response.json")

//set base URL for axios
axios.defaults.baseURL = USGS_CONSTANT.USGS_URL;

//login and get promise for api key
var api_key = USGS_HELPER.get_api_key();

var test_api_call = function(apiKey, request_code, body){

  //construct the request json
  const api_key_object = {apiKey};
  const request_body = USGS_HELPER.mergejson(api_key_object, body);
  const usgs_request_code = USGS_HELPER.get_usgs_response_code(request_code);

  //make call to USGS api and return promise
  return USGS_HELPER.get_usgsapi_response(ugss_request_code, request_body);

}

describe('USGS API TESTS', function() {

  describe('USGS login', function() {
    it('should be fullfilled', function(done) {
      // const test_promise =;
      api_key.should.be.fulfilled.and.notify(done);
    })

    it('should have data in data key (the api key)', function(done) {

      api_key.then(function(result){
        try {

          expect(result).to.have.length.of.at.least(5);

          done();
        } catch(err) {
          done(err);
        }
      }, done);

    })
  });


  describe('USGS request code: datasetfields', function() {

    it('should be fullfilled', function(done) {
      api_key.then( apiKey => {
        const test_promise = test_api_call(apiKey, 'datasetfields', test_datasetfields_request_json)
        test_promise.should.be.fulfilled.and.notify(done);
      })
    })

    it('response json should match', function(done) {
      api_key.then( apiKey => {
        const test_promise = test_api_call(apiKey, 'datasetfields', test_datasetfields_request_json)
        test_promise.then(function(result){
          try {
            expect(result).to.be.like(test_datasetfields_response_json);
            done();
          } catch(err) {
            done(err);
          }
        }, done);
      })
    })

  });
 
  describe('USGS request code: download', function() {

    it('should be fullfilled', function(done) {
      api_key.then( apiKey => {
        const test_promise = test_api_call(apiKey, 'download', test_download_request_json)
        test_promise.should.be.fulfilled.and.notify(done);
      })
    })

    it('response should be an array', function(done) {
      api_key.then( apiKey => {
        const test_promise = test_api_call(apiKey, 'download', test_download_request_json)
        test_promise.then(function(result){
          try {
            expect(result).to.be.an('array')
            done();
          } catch(err) {
            done(err);
          }
        }, done);
      })
    })

  });

  describe('USGS request code: downloadoptions', function() {

    // Each time we run a download request the response url will have a new iid field in the url,
    // so we can't check the response against a static url

    it('should be fullfilled', function(done) {
      api_key.then( apiKey => {
        const test_promise = test_api_call(apiKey, 'downloadoptions', test_downloadoptions_request_json)
        test_promise.should.be.fulfilled.and.notify(done);
      })
    })

    it('response should be an array', function(done) {
      api_key.then( apiKey => {
        const test_promise = test_api_call(apiKey, 'downloadoptions', test_downloadoptions_request_json)
        test_promise.then(function(result){
          try {
            expect(result).to.be.like(test_downloadoptions_response_json)
            done();
          } catch(err) {
            done(err);
          }
        }, done);
      })
    })

  });



});
