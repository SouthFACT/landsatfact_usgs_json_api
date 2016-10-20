var axios = require('axios');
var assert = require('assert');
var chai = require('chai');
var expect  = require("chai").expect;
var should = require('chai').should();
chai.use(require('chai-fuzzy'));
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

const USGS_CONSTANT = require("../lib/usgs_api/usgs_constants.js");
const USGS_FUNCTION = require("../lib/usgs_api/usgs_functions.js");
const USGS_HELPER = require("../lib/usgs_api/usgs_helpers.js");

//set base URL for axios
axios.defaults.baseURL = USGS_CONSTANT.USGS_URL;

//login and get promise for api key
const api_key_promise = USGS_HELPER.get_api_key();

//get testjson
const test_datasets_request_json = require('../json/test-datasets-request.json')
const test_datasets_response_json = require('../json/test-datasets-response.json')

const test_datasetfields_request_json = require("../json/test-datasetfields-request.json")
const test_datasetfields_response_json = require("../json/test-datasetfields-response.json")

const test_download_request_json = require("../json/test-download-request.json")
// regular expression
const test_download_response_regexp = /.*tar.gz\?id=[a-zA-Z0-9]*&iid=LC80130282014100LGN00&did=[0-9]*&ver=production/

const test_downloadoptions_request_json = require("../json/test-downloadoptions-request.json")
const test_downloadoptions_response_json = require("../json/test-downloadoptions-response.json")

const test_metadata_request_json = require("../json/test-metadata-request.json")
const test_metadata_response_json = require("../json/test-metadata-response.json")

const test_search_request_json = require("../json/test-search-request.json")
const test_search_response_json = require("../json/test-search-response.json")

const test_getbulkdownloadproducts_request_json = require("../json/test-getbulkdownloadproducts-request.json")
const test_getbulkdownloadproducts_response_json = require("../json/test-getbulkdownloadproducts-response.json")

const test_api_call = function (request_code, body) {
  return api_key_promise.then(
    // fulfilled
    function (apiKey) {
      const api_key_object = {apiKey};
      const request_body = USGS_HELPER.mergejson(api_key_object, body);
      const usgs_request_code = USGS_HELPER.get_usgs_response_code(request_code);
      //make call to USGS api and return promise
      return USGS_HELPER.get_usgsapi_response(usgs_request_code, request_body);
    }
  )
}

describe('USGS API TESTS', function() {

  describe("API key", function() {
    it('returns a valid api key', function() {
      return api_key_promise.should.be.fulfilled.and.eventually.have.length.of.at.least(5);
    })

    it('promise rejects for strings that are not real request codes', function () {
      const test = test_api_call('dafdsa', {})
      return test.should.be.rejected;
    })
  });

  describe("request code: 'datasetfields'", function() {
    it('response json is what we expect it to be', function() {
      const test_promise = test_api_call('datasetfields', test_datasetfields_request_json)
      return test_promise.should.eventually.be.like(test_datasetfields_response_json);
    })
  });

  describe("request code: 'download'", function() {
    it('download URL structure is what we expect it to be', function() {
      const test_promise = test_api_call('download', test_download_request_json)
      const test_result = test_promise.then(function (response) {
        const download_url = response[0]
        return test_download_response_regexp.test(download_url)
      })
      return test_result.should.eventually.equal(true)
    })
  })

  describe("request code: 'search'", function() {
    it('response json is what we expect it to be', function() {
      const test_promise = test_api_call('search', test_search_request_json)
      return test_promise.should.eventually.be.like(test_search_response_json)
    })
  })

  describe("request code: 'metadata'", function () {
    it('response json is what we expect it to be', function () {
      const test_promise = test_api_call('metadata', test_metadata_request_json)
      return test_promise.should.eventually.be.like(test_metadata_response_json)
    })
  })

  describe("request code: 'downloadoptions'", function () {
    it('response json is what we expect it to be', function () {
      const test_promise = test_api_call('downloadoptions', test_downloadoptions_request_json)
      return test_promise.should.eventually.be.like(test_downloadoptions_response_json)
    })
  })

  describe("request code: 'datasets'", function () {
    it('response json has expected properties', function (done) {
      const test_promise = test_api_call('datasets', test_datasets_request_json)
      test_promise.should.be.fulfilled.then(function (result) {
        expect(result).to.be.an('array')
        result.forEach(function(obj) {
          expect(obj).to.be.an('object').with.all.keys([
            "bounds",
            "datasetName",
            "datasetFullName",
            "idnEntryId",
            "endDate",
            "startDate",
            "lastModifiedDate",
            "supportDownload",
            "supportBulkDownload",
            "bulkDownloadOrderLimit",
            "supportCloudCover",
            "supportOrder",
            "orderLimit",
            "totalScenes"
          ])
          expect(obj['bounds']).to.be.an('object').with.all.keys(
            [ 'north', 'east', 'south', 'west' ]
          )
        })
      }).should.notify(done)

    })
  })

  describe("request code: 'getbulkdownloadproducts'", function () {
    it('response json has expected properties', function (done) {
      const test_promise = test_api_call('getbulkdownloadproducts', test_getbulkdownloadproducts_request_json)

      test_promise.should.be.fulfilled.then(function (result) {
        expect(result).to.be.an('array')

        result.forEach(function(entityObj) {
          expect(entityObj).to.be.an('object').with.all.keys(['entityId','orderingId','products'])
          expect(entityObj).to.have.property('products').which.is.an('array')

          entityObj['products'].forEach(function(product) {
            expect(product).to.be.an('object').with.all.keys([
              'available',
              'downloadCode',
              'filesize',
              'productName',
              'url',
              'storageLocation'
            ])
          })
        })
      }).should.notify(done)
    })
  })

  describe("request code: 'itembasket'", function () {
    it('response json has expected properties', function (done) {
      const test_promise = test_api_call('itembasket', {})

      test_promise.should.be.fulfilled.then(function (result) {
        expect(result).to.be.an('object').with.all.keys(['bulkDownloadItemBasket', 'orderItemBasket'])
        expect(result['bulkDownloadItemBasket']).to.be.an('array')

        result['bulkDownloadItemBasket'].forEach(function (basketItem) {
          expect(basketItem).to.be.an('object').with.all.keys(['dataset', 'bulkDownloadScenes'])
          expect(basketItem['bulkDownloadScenes']).to.be.an('array')

          basketItem['bulkDownloadScenes'].forEach(function (sceneObj) {
            expect(sceneObj).to.be.an('object').with.all.keys([
              'available','downloadCode','filesize','productName','url'
            ])
          })
        })

        expect(result['orderItemBasket']).to.be.an('array')

        result['orderItemBasket'].forEach(function (basketItem) {
          expect(basketItem).to.be.an('object').with.all.keys(['dataset','orderScenes'])
          expect(basketItem['orderScenes']).to.be.an('array')

          basketItem['orderScenes'].forEach(function (sceneObj) {
            expect(sceneObj).to.be.an('object').with.all.keys(['entityId','orderingId','product'])
            expect(sceneObj['product']).to.be.an('object').with.all.keys([
              'option','originator','outputMedia','price','productCode','productName'
            ])
          })
        })

      }).should.notify(done)
    })
  })
  
});
