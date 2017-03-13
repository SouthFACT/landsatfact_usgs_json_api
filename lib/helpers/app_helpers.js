var fs = require('fs');
var yaml = require('yamljs')
var winston = require('winston');

function app_helpers() {

  var logger = require.main.exports.logger

  if (!logger) {
    var log_file = 'app_helpers'
    var logger = require('./logger.js')(log_file)
  }

  return {

    get_db_config: function () {
      if (process.env.NODE_ENV === 'test') {
        return {
          host: process.env.LSF_DB_HOST,
          database: process.env.LSF_DB_NAME,
          user: process.env.LSF_DB_USER,
          password: process.env.LSF_DB_PASSWORD,
          port: process.env.LSF_DB_PORT,
          idleTimeoutMillis: process.env.LSF_DB_TIMEOUT,
          max: process.env.LSF_DB_MAX_CLIENTS
        }
      } else {
        return yaml.load('./lib/postgres/config.yaml')
      }
    },

    get_usgs_config: function() {
      if (process.env.NODE_ENV === 'test') {
        return {
          username: process.env.USGS_API_USERNAME,
          password: process.env.USGS_API_PASSWORD,
          download_directory: process.env.USGS_DOWNLOAD_DIR
        }
      }
      else {
        return yaml.load('./lib/usgs_api/config.yaml')
      }
    },



    //write the file for dowloaded scenes used by lcv process.
    //  the orignal file was written by php and used a php format of :
        // Array
        // (
        //     [0] => ./downloads/LT50190331989361XXX02.tar.gz
        //     [1] => ./downloads/LT50210401989343XXX02.tar.gz
    // to ensure compatability with the original we are matching this format
    write_file: function(destination, list, usephp){

      // temporary data holder
      var file = fs.createWriteStream(destination);

      //file originally written by php so need to mimic the output.
      //  will talk to everyone about how to change it.
      if(usephp){
        file.write("Array\n")
        file.write("(\n")
      }

      var count = 0;

      if(list.length === 0){
        file.write("\n");
      }

      //walk the array of files and write them out
      list.map( datachunk => {
        var start = "";
        var end = ""

        //ADD php formating if using usephp is true
        if(usephp){
          start = "    [";
          end = "] => ";
        }

        //ADD php formating if using usephp is true
        if(!usephp){
          count = "";
        }
        //ADD php formating if using usephp is true
        file.write(start + count + end + datachunk + "\n");
        count = count + 1

      })

      //ADD php formating if using usephp is true
      if(usephp){
        file.write(")\n")
      }

    },


    // remove on day from current day
    date_by_subtracting_days: function(date, days) {
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() - days,
            date.getHours(),
            date.getMinutes(),
            date.getSeconds(),
            date.getMilliseconds()
        );
    },

    //check if a file exists synchronously
    file_exists: function(path) {
      try {
        fs.accessSync(path, fs.F_OK);
          return true
        } catch (e) {
          return false
        }
    },


    //delete a file used to manage logs and failed download and error files
    delete_file: function(file){

      //check if file exists
      the_file_exists = this.file_exists(file);

      //if the file exists delete it.
      if (the_file_exists){
        fs.unlink(file, function(err){
          if(err) {
            logger.log(logger.LEVEL_ERROR, err);
          } else {
            msg_header = 'old file deleted';
            msg = file;
            logger.log(logger.LOG_LEVEL_INFO, msg_header, msg)
          }
        })
      }
    },

    //deletes old log and failure files (older than 7 days)
    delete_old_files: function(name, folder, extention){

      const days_to_keep_files = 7;
      const days_to_look_back = 40;


      for(var i = days_to_keep_files; i < days_to_look_back; i++) {

        //create string for dates.
        var days_ago = new Date();
        days_ago.setDate(days_ago.getDate()-i);
        days_ago_string = this.get_date_string(days_ago)

        //log file location and name
        var file = folder + name +'-' + days_ago_string + extention

        //delete old files
        this.delete_file(file)

      }

    },

    //function builds a list of scenes for using in a SQL where in statement
    list_array_to_sql_list: function(array){

      var list = "";

      //assumes that the array is simple list of items that can be converted into
      //  list sutable for sql in where clause list
      array.forEach(function (line) {
        list = list + "'" + line  + "',";
      });

      list  = "(" + list.substring(0,list.length-1) + ")"
      return list

    },

    //function converts a contents of a file into array of strings fro each line
    file_list_to_array: function(file){

      //check if file exists first
      the_file_exists = this.file_exists(file);

      if(the_file_exists){
        //take each line of file and make the lines into array elements
        //  really assumes each line is one thing or a list
        return fs.readFileSync(file).toString().split('\n')
      } else {
        return ['']
      }

    },

    //function to create a sting from the current date for writing logs and other files...
    //   the date input is optional if you pass nothing this function assumes todays date
    get_date_string: function(date){
      var date;

      if(!date){
        the_date = new Date()
      } else {
        the_date = date
      }

      return the_date.getFullYear()+""+("0" + (the_date.getMonth() + 1)).slice(-2)+""+("0" + the_date.getDate()).slice(-2)
    },


    //get yesterdays download failures and add get a SQL list
    //  so we can add it to todays list.  if it fails it should again it will end up back on the
    //  download list
    get_yesterdays_failures: function() {

      var list = "";
      const dayago_string = this.date_by_subtracting_days(new Date(),1)

      //format a day string for writing failires
      const dayago = this.get_date_string(dayago_string)

      const file = 'download_failed-' + dayago + '.txt';

      const yesterdays_failed_scenes = this.file_list_to_array(file);

      list = this.list_array_to_sql_list(yesterdays_failed_scenes);

      return list;
    },

  }

}


module.exports = app_helpers;
