var assert = require('assert');
var expect  = require("chai").expect;
var should = require('chai').should();
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



});
