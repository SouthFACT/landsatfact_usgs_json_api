
var winston = require('winston');

var app_helpers = require('./app_helpers.js')()

module.exports = function (filename, writes_to_console) {

  writes_to_console = writes_to_console === undefined ? true : writes_to_console

  var today = app_helpers.get_date_string()
  var logger_file = 'logs/' + filename + '-' + today + '.log'
  app_helpers.delete_old_files(filename, 'logs/', '.log')
  var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.File)({ filename: logger_file})
    ]
  })
  
  return {

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
