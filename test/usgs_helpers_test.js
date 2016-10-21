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

    it('extracts error text from response json', function() {
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

     assert.equal(testobj.data.error, USGS_HELPER.get_response_error(testobj))

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


  describe('check_slc' ,function (){
    it('should return false if date is before May 5th 2003 ', function() {

      var test_date = "2003-05-01";
      var expected_result = false;
      const result = USGS_HELPER.check_slc(test_date);
      expect(result).to.be.like(expected_result);


    })

    it('should return false if date is equal May 5th 2003 ', function() {

      var test_date = "2003-05-05";
      var expected_result = false;
      const result = USGS_HELPER.check_slc(test_date);
      expect(result).to.be.like(expected_result);


    })

    it('should return true if date is after May 5th 2006 ', function() {

      var test_date = "2006-05-15";
      var expected_result = true;
      const result = USGS_HELPER.check_slc(test_date);
      expect(result).to.be.like(expected_result);


    })

  })


  describe('get_product_abbrevation' ,function (){
    it('should return L8 if LC80130292014100LGN00', function() {

      var test_str = "LC80130292014100LGN00";
      var expected_result = 'LC8';
      const result = USGS_HELPER.get_product_abbrevation(test_str);
      expect(result).to.be.like(expected_result);


    })

    it('should return LE7 if LE70220342016257EDC00', function() {

      var test_str = "LE70220342016257EDC00";
      var expected_result = "LE7";
      const result = USGS_HELPER.get_product_abbrevation(test_str);
      expect(result).to.be.like(expected_result);


    })

    it('should return LT5 if LT50300392003237PAC02', function() {

      var test_str = "LT50300392003237PAC02";
      var expected_result = "LT5";
      const result = USGS_HELPER.get_product_abbrevation(test_str);
      expect(result).to.be.like(expected_result);


    })

  })


  describe('get_datasetName' ,function (){
    it('should return LANDSAT_8 if LC80130292014100LGN00', function() {

      var test_str = "LC80130292014100LGN00";
      var test_date = "2006-05-15"
      var expected_result = 'LANDSAT_8';
      const result = USGS_HELPER.get_datasetName(test_str, test_date);
      expect(result).to.be.like(expected_result);


    })

    it('should return LANDSAT_TM if LT50300392003237PAC02', function() {

      var test_str = "LT50300392003237PAC02";
      var test_date = "2003-04-15"
      var expected_result = 'LANDSAT_TM';
      const result = USGS_HELPER.get_datasetName(test_str, test_date);
      expect(result).to.be.like(expected_result);


    })


    it('should return LANDSAT_ETM_SLC_OFF if LE70220342016257EDC00', function() {

      var test_str = "LE70220342016257EDC00";
      var test_date = "2016-09-13"
      var expected_result = 'LANDSAT_ETM_SLC_OFF';
      const result = USGS_HELPER.get_datasetName(test_str, test_date);
      expect(result).to.be.like(expected_result);


    })

    it('should return LANDSAT_ETM if LE70160332003147EDC00', function() {

      var test_str = "LE70160332003147EDC00";
      var test_date = "2003-05-27"
      var expected_result = 'LANDSAT_ETM';
      const result = USGS_HELPER.get_datasetName(test_str, test_date);
      expect(result).to.be.like(expected_result);


    })

  })


});
