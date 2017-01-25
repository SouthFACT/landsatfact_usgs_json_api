var assert = require('assert')
var chai = require('chai')
var expect  = require("chai").expect
var should = require('chai').should()
var yaml = require('yamljs')
chai.use(require('chai-fuzzy'))
var chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)
var fs = require('fs')


var dataset_fields = require(
  '../json/test_real_usgs_api/test_datasetfields_request.json'
).response
// path is relative to root for yaml.load
const meta_yaml = yaml.load('./config/metadata.yaml')
var dataset = meta_yaml.metadata_datasets[0]

const update_metadata = require('../../update_landsat_metadata.js')
const update_lsf_database = require("../../lib/postgres/update_lsf_database.js")

const sample_metadata_xml = fs.readFileSync(
  './test/sample-datasetfields-get.xml', 'utf8'
)
const sample_metadata = { 'data': sample_metadata_xml }
var parse_xml = update_metadata.parse_scene_metadata_xml(sample_metadata)


describe('update_landsat_metadata.js', function () {

  describe('process_metadata_field', function () {
    const expected = [
      { name: 'scene_id', value: '\r\n  LE70330372017016EDC00' },
      { name: 'sensor', value: 'OLI_TIRS' },
      { name: 'acquisition_date', value: '\r\n2017/01/16' },
      { name: 'browse_url',
        value: '\r\nhttps://earthexplorer.usgs.gov/browse/etm/33/37/2017/LE70330372017016EDC00_REFL.jpg' },
      { name: 'path', value: '\r\n 033' },
      { name: 'row', value: '\r\n 037' },
      { name: 'cc_full', value: '' },
      { name: 'cc_quad_ul', value: 0 },
      { name: 'cc_quad_ur', value: 0 },
      { name: 'cc_quad_ll', value: 0 },
      { name: 'cc_quad_lr', value: 0 },
      { name: 'data_type_l1', value: 'ETM+' },
      { name: 'l1_key', value: 999999 }
    ]
    var result = parse_xml.then(function (metadata_json) {
      const meta_field = metadata_json[0].scene.metadataFields[0]
      const browse_json = metadata_json[0].scene.browseLinks
      var records = []
      update_metadata.process_metadata_field(
        dataset, meta_field, browse_json, records
      )
      return records
    })
    expect(result).to.eventually.be.like(expected)
  })

  describe('parse_scene_metadata_xml', function () {
    it('resolves with parsed xml when given good data', function () {
      expect(parse_xml).to.be.fulfilled.and.eventually.be.an('array')
    })
  })

  describe('process_scene_metadata', function () {
    it('creates a list of records we expect', function () {

    })
  })

  // Helpers

  const test_fields = meta_yaml.metadata_datasets[0].fields
  const test_child_filters = [
    { filterType: 'between', fieldId: '10036',
      firstValue: 13, secondValue: 33 },
    { filterType: 'between', fieldId: '10038',
      firstValue: 33, secondValue: 43 }
  ]

  describe('limit_json', function () {
    it('limits json to relevant keys', function () {
      const test_limit_keys = ['name']
      const field_name = test_fields[0].fieldName
      const result = update_metadata.limit_json(
        dataset_fields, test_limit_keys, field_name
      )
      const expected = [
        { fieldId: '10036',
        name: 'WRS Path',
        fieldLink: 'https://lta.cr.usgs.gov/landsat_dictionary.html#wrs_path',
        valueList: [] }
      ]
      expect(result).to.be.like(expected)
    })

  })

  describe('make_child_filter', function () {
    it('returns an object with expected properties', function () {
      const filterType = 'and'
      const fieldId = '10034'
      const firstValue = 33
      const secondValue = 43
      const expected = {
        filterType,
        fieldId,
        firstValue,
        secondValue
      }
      const result = update_metadata.make_child_filter(
        filterType, fieldId, firstValue, secondValue
      )
      expect(result).to.be.like(expected)
    })
  })

  describe('make_additionalCriteria_filter', function () {
    it('returns an object with expected properties', function () {
      const filterType = 'and'
      const expected = {
        'filterType': 'and',
        'childFilters': test_child_filters
      }
      const result = update_metadata.make_additionalCriteria_filter(
        filterType,
        test_child_filters
      )
      expect(result).to.be.like(expected)
    })
  })

  describe('get_child_filters', function () {
    const result = update_metadata.get_child_filters(test_fields, dataset_fields)
    
    it('builds a list of child filter objects', function () {
      expect(result).to.be.like(test_child_filters)
    })
  })

  describe('fix_data_type_l1_vals', function () {

  })

  describe('get_browse_url_fieldset', function () {

  })

  describe('get_api_fieldset', function () {
    it('returns an object with expected properties: value set to empty string',
      function () {
        const configFieldName = 'Scene Cloud Cover'
        const databaseFieldName = 'cc_full'
        const expected = { name: 'cc_full', value: '' }
        var result = parse_xml.then(function(metadata) {
          var meta_field = metadata[0].scene.metadataFields[0].metadataField
          const fieldSet = update_metadata.get_api_fieldset(
            meta_field, configFieldName, databaseFieldName
          )
          return fieldSet
        })
        expect(result).to.eventually.be.like(expected)

      }
    )

    it('returns an object with expected properties', function () {
      const configFieldName = 'Date Acquired'
      const databaseFieldName = 'acquisition_date'
      const expected = { name: 'acquisition_date', value: '\r\n2017/01/16' }
      var result = parse_xml.then(function (metadata) {
        var meta_field = metadata[0].scene.metadataFields[0].metadataField
        const fieldSet = update_metadata.get_api_fieldset(
          meta_field, configFieldName, databaseFieldName
        )
        return fieldSet
      })
      expect(result).to.eventually.be.like(expected)
    })

  })


  describe('get_constant_fieldset', function () {

    it('returns an object with expected properties', function () {
      const configFieldName = 'OLI_TIRS'
      const databaseFieldName = 'sensor'
      const expected = {
        'name': databaseFieldName,
        'value': configFieldName
      }
      const result = update_metadata.get_constant_fieldset(
        configFieldName, databaseFieldName
      )
      expect(result).to.be.like(expected)
    })
  })


})