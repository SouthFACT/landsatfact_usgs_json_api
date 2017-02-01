var Promise = require('bluebird')
Promise.longStackTraces()

function main() {
  return Promise.resolve().then(function () {
    return test_map()
  }).catch(function (err) {
    console.log(err)
  })
}

function test_map() {
  var arr = Array(5)
  arr.map(e => {
    return Promise.reject('reject')
  })
  return Promise.resolve().then(function () {
    return arr
  })
}