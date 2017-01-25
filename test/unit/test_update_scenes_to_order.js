var assert = require('assert')
var chai = require('chai')
var expect  = require("chai").expect
var should = require('chai').should()
chai.use(require('chai-fuzzy'))
var chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)

var fake_options_data = require("../json/test_fake_dl_options_response.json")
const to_order = require('../../update_scenes_to_order.js')

describe('update_scenes_to_order.js', function() {

  describe("build_update_query", function() {
    const scene_list = [
      'LT50210401994261XXX01',
      'LT50330382009162PAC02',
      'LE70300392016233EDC00'
    ]

    it("builds query for scenes that need ordering", function () {
      const built_query_actual = to_order.build_update_query(scene_list, 'NO')
      const built_query_verify = ""
        +"UPDATE landsat_metadata "
          +"SET needs_ordering = 'NO', download_available = 'YES' "
          +"WHERE scene_id IN ("
            +"'LT50210401994261XXX01',"
            +"'LT50330382009162PAC02',"
            +"'LE70300392016233EDC00'"
          +")"
      expect(built_query_actual).to.equal(built_query_verify)
    })

    it("builds query for scenes that do not need ordering", function () {
      const built_query_actual = to_order.build_update_query(scene_list, 'YES')
      const built_query_verify = ""
        +"UPDATE landsat_metadata "
          +"SET needs_ordering = 'YES', download_available = 'NO' "
          +"WHERE scene_id IN ("
            +"'LT50210401994261XXX01',"
            +"'LT50330382009162PAC02',"
            +"'LE70300392016233EDC00'"
          +")"
      expect(built_query_actual).to.equal(built_query_verify)
    })

  })

  describe("sort_options_by_avail", function () {

    it("sorts dl options correctly, including only standard options",
      function (done) {

        var test_result = to_order.sort_options_by_avail(fake_options_data)
        var no_standard_option_scene = 'LT50280401995089XXX01'
        var expected_result = {
          'available': [
            'LT50210351996331AAA01',
            'LT50210351996363XXX01'
          ],
          'unavailable': [
            'LT50270401994127XXX02',
            'LT50210351996251XXX03'
          ]
        }
        test_result.then(function (result) {
          expected_result.available.forEach(function (scene_id) {
            expect(result.available).to.include(scene_id)
            expect(result.available).to.not.include(no_standard_option_scene)
          })
          expected_result.unavailable.forEach(function (scene_id) {
            expect(result.unavailable).to.include(scene_id)
            expect(result.unavailable).to.not.include(no_standard_option_scene)
          })
        }).should.be.fulfilled.and.notify(done)
      }
    )

    it("returns an object with empty lists if given an empty list as input",
      function (done) {
        var test_result = to_order.sort_options_by_avail([])
        var expected_result = {
          'available': [],
          'unavailable': []
        }
        test_result.then(function (result) {
          expect(result.available).to.be.empty
          expect(result.unavailable).to.be.empty
        }).should.be.fulfilled.and.notify(done)
      }
    )

  })
})