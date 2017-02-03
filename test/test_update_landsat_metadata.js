// Libraries
var assert = require('assert')
var chai = require('chai')
var expect  = require("chai").expect
var should = require('chai').should()
var yaml = require('yamljs')
var fs = require('fs')
var Promise = require('bluebird')
Promise.longStackTraces()

// Test runner config
chai.use(require('chai-fuzzy'))
var chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)

// Modules
const update_metadata = require('../update_landsat_metadata.js')
const update_lsf_database = require("../lib/postgres/update_lsf_database.js")
const meta_yaml = yaml.load('./config/metadata.yaml')
const datasets_config = meta_yaml.metadata_datasets

const XML_DIR = './test/metadata_xml/'

function read_file (dir, filename, encoding) {
  var fileString = fs.readFileSync(dir+filename, encoding || 'utf8')
  // remove carriage returns and linefeeds
  return fileString.replace(/(\r|\n|\r\n)/g, '')
}

const metadata_xml = {
  'LANDSAT_8': read_file(
    XML_DIR, 'LANDSAT_8_LC80130292014100LGN00.xml'),
  'LANDSAT_ETM': read_file(
    XML_DIR, 'LANDSAT_ETM_LE70260352003057EDC00.xml'),
  'LANDSAT_TM': read_file(
    XML_DIR, 'LANDSAT_TM_LT50200392011109EDC00.xml'),
  'LANDSAT_ETM_SLC_OFF': read_file(
    XML_DIR, 'LANDSAT_ETM_SLC_OFF_LE70330372017016EDC00.xml')
}

const expected = {
  'LANDSAT_8': {
    'make_scene_record': [
      { name: 'scene_id', value: 'LC80130292014100LGN00' },
      { name: 'sensor', value: 'OLI_TIRS' },
      { name: 'acquisition_date', value: '2014/04/10' },
      { name: 'browse_url',
        value: 'https://earthexplorer.usgs.gov/browse/landsat_8/2014/013/029/LC80130292014100LGN00.jpg' },
      { name: 'path', value: ' 013' },
      { name: 'row', value: ' 029' },
      { name: 'cc_full', value: '42.88' },
      { name: 'cc_quad_ul', value: 0 },
      { name: 'cc_quad_ur', value: 0 },
      { name: 'cc_quad_ll', value: 0 },
      { name: 'cc_quad_lr', value: 0 },
      { name: 'data_type_l1', value: 'L1T' },
      { name: 'l1_key', value: 999999 }
    ]
  },
  'LANDSAT_ETM': {
    'make_scene_record': [
      { name: 'scene_id', value: 'LE70260352003057EDC00' },
      { name: 'sensor', value: 'LANDSAT_ETM' },
      { name: 'acquisition_date', value: '2003/02/26' },
      { name: 'browse_url',
        value: 'https://earthexplorer.usgs.gov/browse/etm/26/35/2003/LE70260352003057EDC00_REFL.jpg' },
      { name: 'path', value: ' 026' },
      { name: 'row', value: ' 035' },
      { name: 'cc_full', value: '  99.99' },
      { name: 'cc_quad_ul', value: ' 100.00' },
      { name: 'cc_quad_ur', value: ' 100.00' },
      { name: 'cc_quad_ll', value: ' 100.00' },
      { name: 'cc_quad_lr', value: '  99.96' },
      { name: 'data_type_l1', value: 'L1G' },
      { name: 'l1_key', value: 999999 }
    ]
  },
  'LANDSAT_TM' : {
    'make_scene_record': [
      { name: 'scene_id', value: 'LT50200392011109EDC00' },
      { name: 'sensor', value: 'LANDSAT_TM' },
      { name: 'acquisition_date', value: '2011/04/19' },
      { name: 'browse_url',
        value: 'https://earthexplorer.usgs.gov/browse/tm/20/39/2011/LT50200392011109EDC00_REFL.jpg' },
      { name: 'path', value: ' 020' },
      { name: 'row', value: ' 039' },
      { name: 'cc_full', value: '7.31' },
      { name: 'cc_quad_ul', value: '10.34' },
      { name: 'cc_quad_ur', value: '3.88' },
      { name: 'cc_quad_ll', value: '5.02' },
      { name: 'cc_quad_lr', value: '10.01' },
      { name: 'data_type_l1', value: 'TM L1T' },
      { name: 'l1_key', value: 999999 }
    ]
  },
  'LANDSAT_ETM_SLC_OFF': {
    'make_scene_record': [
      { name: 'scene_id', value: 'LE70330372017016EDC00' },
      { name: 'sensor', value: 'LANDSAT_ETM_SLC_OFF' },
      { name: 'acquisition_date', value: '2017/01/16' },
      { name: 'browse_url',
        value: 'https://earthexplorer.usgs.gov/browse/etm/33/37/2017/LE70330372017016EDC00_REFL.jpg' },
      { name: 'path', value: ' 033' },
      { name: 'row', value: ' 037' },
      { name: 'cc_full', value: '  51.12' },
      { name: 'cc_quad_ul', value: '  46.80' },
      { name: 'cc_quad_ur', value: '  68.96' },
      { name: 'cc_quad_ll', value: '  51.79' },
      { name: 'cc_quad_lr', value: '  36.92' },
      { name: 'data_type_l1', value: 'L1T' },
      { name: 'l1_key', value: 999999 }
    ]

  }
}

describe('update_landsat_metadata.js', function () {
  test_all_datasets()
  test_helpers()
})


/////////////////////////////////////////////////////////////////////////


function test_all_datasets () {
  datasets_config.forEach(function (dataset_config) {
    test_dataset(dataset_config)
  })
}

function test_dataset (dataset_config) {
  const scene_metadata_xml = metadata_xml[dataset_config.datasetName]
  const scene_metadata_xml_obj = { 'data' : scene_metadata_xml }
  const parse_metadata_prom = update_metadata
      .parse_scene_metadata_xml(dataset_config, scene_metadata_xml_obj)

  var record = parse_metadata_prom.then(function (scene_metadata) {
    var field_list = update_metadata.make_scene_record(
      dataset_config, scene_metadata
    )
    return field_list
  })

  describe(dataset_config.datasetName, function () {
    describe('make_scene_record', function () {
      it('returns an expected list of field objects', function () {
        return expect(record).to.eventually.be.like(
          expected[dataset_config.datasetName].make_scene_record
        )
      })
    })

  })

}


function test_helpers () {
  describe('HELPERS', function () {
    const test_fields = datasets_config[0].fields
    const dataset_fields = require(
      './json/test_usgs_api/test_datasetfields_request.json'
    ).response
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
        const result = update_metadata.limit_json(dataset_fields, test_limit_keys, field_name)
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

    describe('get_browse_url_fieldset', function () {

    })

    describe('fix_data_type_l1_vals', function () {

    })

    describe('get_api_fieldset', function () {

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

}

