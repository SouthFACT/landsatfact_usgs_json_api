#!/bin/bash

# declare an array called usgs_api_processes and add any process that uses the api
#   this should help stop any possible simaltaneous api calls
usgs_api_processes=( 'landsatfact-data-dev.nemac.org/project/lsf_metadata_cron.sh' 'landsatFACT_LCV.py' 'update_scenes_to_order.js' 'download_landsat_data.php' 'customRequest.py' 'order_landsat_data.js')
