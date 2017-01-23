var assert = require('assert')
var chai = require('chai')
var expect  = require("chai").expect
var should = require('chai').should()
chai.use(require('chai-fuzzy'))
var chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)

update_metadata = require('../update_landsat_metadata.js')