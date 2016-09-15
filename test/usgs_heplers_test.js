var assert = require('assert');
var chai = require('chai');
var expect  = require("chai").expect;
var should = require('chai').should();
chai.use(require('chai-fuzzy'));

var USGS_HELPER = require("../lib/usgs_api/usgs_helpers.js");


describe('USGS Helpers TESTS', function() {
  describe('create_PostBody', function() {
    it('should append a stringified object with a to jsonRequest=', function() {

      var teststr = "test"
      var testobj = {teststr}
      var testojbstr = JSON.stringify(testobj)

      var result = USGS_HELPER.create_PostBody(testobj);
      assert.equal(result,'jsonRequest='+testojbstr);

    });
  });

  describe('get_response_data' ,function (){

    it('should append the usgs action to /', function() {

      var teststr = "test"
      var result = USGS_HELPER.create_url_action(teststr);
      assert.equal(result,'/'+teststr);


    })

  })

  describe('get_response_data' ,function (){

    it('should retrieve the .data key from a USGS response', function() {

      var testobj = {
        responsetest:"responsetest",
        data:{
          "errorCode":null,
          "error":"",
          "data":"9ccf44a1c7e74d7f94769956b54cd889",
          "api_version":"1.0"
        }
      }

      expectedresult = "9ccf44a1c7e74d7f94769956b54cd889"
      var result = USGS_HELPER.get_response_data(testobj);
      assert.equal(result, expectedresult);

    })


  })


  describe('makeLoginData' ,function (){


    it('should have two keys username and password', function() {

      const name = "test_name";
      const pass = "test_pass";
      const result = USGS_HELPER.makeLoginData(name, pass);
      expect( result ).to.have.all.keys('username', 'password');

    })

    it('should have two keys username and password with values', function() {

      const name = "test_name";
      const pass = "test_pass";
      const result = USGS_HELPER.makeLoginData(name, pass);
      assert.equal(result.username, name);
      assert.equal(result.password, pass);

    })

  })

  describe('get_response_error' ,function (){

    it('should throw an error based on error in error key from a USGS response', function() {
      var testerror = "test error"
      var testobj = {
        responsetest:"responsetest",
        data:{
          "errorCode": 123,
          "error": testerror,
          "data":"9ccf44a1c7e74d7f94769956b54cd889",
          "api_version":"1.0"
        }
      }

     assert.throws( function() { USGS_HELPER.get_response_error(testobj); }, Error );

    })

  })

  describe('get_usgs_response_code' ,function (){

    it('should throw error if not a valid request code', function() {

      const request_code = "not valid";

      assert.throws( function() { USGS_HELPER.get_usgs_response_code(request_code) }, Error );

    })

    it('should return code for all valid request codes', function() {

      const request_codes = ['clearbulkdownloadorder',
                     'clearorder',
                     'datasetfields',
                     'datasets',
                     'download',
                     'downloadoptions',
                     'getbulkdownloadproducts',
                     'getorderproducts',
                     'grid2ll',
                     'itembasket',
                     'login',
                     'logout',
                     'removebulkdownloadscene',
                     'removeorderscene',
                     'metadata',
                     'search',
                     'hits',
                     'submitbulkdownloadorder',
                     'submitorder',
                     'updatebulkdownloadscene',
                     'updateorderscene']

      request_codes.map( code => {

        const result = USGS_HELPER.get_usgs_response_code(code);
        assert.equal(result, code);

      })



    })
  })


  describe('mergejson' ,function (){
    it('should merge to json data objects', function() {

      var testobj_1 = {
        "datasetName": "LANDSAT_8",
        "node": "EE",
        "entityIds": ["LC80130292014100LGN00"],
        "products": ["STANDARD"]
      }

      var apiKey = "9ccf44a1c7e74d7f94769956b54cd889";
      var testobj_2 = {apiKey};

      var expected_result =  {
        "datasetName": "LANDSAT_8",
        "node": "EE",
        "entityIds": ["LC80130292014100LGN00"],
        "products": ["STANDARD"],
        "apiKey": "9ccf44a1c7e74d7f94769956b54cd889",
      }
      const result = USGS_HELPER.mergejson(testobj_1, testobj_2);
      expect(result).to.be.like(expected_result);


    })



  })


});