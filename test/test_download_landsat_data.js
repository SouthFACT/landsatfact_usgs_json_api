var assert = require('assert')
var chai = require('chai')
var expect  = require("chai").expect
var should = require('chai').should()
chai.use(require('chai-fuzzy'))
var chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)

var download = require('../download_landsat_data.js')

describe('download_landsat_data.js', function () {
  describe('make_filename', function () {
    it('appends .tar.gz', function () {
      const scene_id = 'LC80130352013353LGN00'
      const expected_result = scene_id + '.tar.gz'
      expect(download.make_filename(scene_id)).to.equal(expected_result)
    })
  })

  describe('make_initial_query', function () {
    const last_days_scenes_query = "SELECT * FROM vw_last_days_scenes LIMIT 10"
    const custom_request_query = "SELECT * FROM landsat_metadata "
      + "WHERE needs_ordering = 'NO' "
        + "AND scene_id IN "
          + "("
            + "'LC80130352013337LGN00',"
            + "'LC80130352013353LGN00',"
            + "'LC80130352014036LGN00'"
          + ")"

    it('returns last days scenes view if given on arguments', function () {
      const test_result = download.make_initial_query([])
      expect(test_result).to.equal(last_days_scenes_query)
    })

    it('returns a select statement if given non-empty list as argument',
      function () {
        const test_result = download.make_initial_query(
          ['LC80130352013337LGN00',
          'LC80130352013353LGN00',
          'LC80130352014036LGN00']
        )
        expect(test_result).to.equal(custom_request_query)
      }
    )

    it('throws an error if the argument list contains more elements '
       +'than the script can support',
      function() {
        var list = []
        // build a list with one element more than is supported
        for (var i=-1; i<download.CONCURRENT_DL_LIMIT; i++) {
          list.push(i)
        }
        // the throw check expects a function argument,
        // so use bind to get the argument passed in
        expect(download.make_initial_query.bind(this,list)).to.throw(Error)
      }
    )
  })


})
