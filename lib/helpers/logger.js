
var winston = require('winston');

var app_helpers = require('./app_helpers.js')()

module.exports = function (filename) {

  var today = app_helpers.get_date_string()
  var logger_file = 'logs/' + filename + '-' + today + '.log'
  app_helpers.delete_old_files(logger_file)
  var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: logger_file})
    ]
  })
  var writes_to_console = true
  
  return {

    // allow for an arbitrary number of extra arguments to log
    log: function (level, msg, val) {
      logger.log(level, msg, val ? val : '')
      if (writes_to_console) console.error(msg, val ? val : '')
    },

    set_log_level: function (level) {
      logger.level = level
    },

    writes_to_console: function (bool) {
      if (bool) {
        writes_to_console = true
      }
      else {
        writes_to_console = false
      }
    },

    LEVEL_INFO: 'info',
    LEVEL_ERROR: 'error',
    LEVEL_DEBUG: 'debug'

  }
}
