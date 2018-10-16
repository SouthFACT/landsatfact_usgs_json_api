
exports.USGS_URL = 'https://earthexplorer.usgs.gov/inventory/json/v/1.3.0/';
exports.REQUEST_POST_HEADERS = {
  headers: {'Content-Type': 'application/x-www-form-urlencoded'}
};


//default node for USGS api EE
// CWIC / LSI Explorer	http://lsiexplorer.cr.usgs.gov	CWIC
// EarthExplorer	http://earthexplorer.usgs.gov	EE
// HDDSExplorer	http://hddsexplorer.usgs.gov	HDDS
// LPCSExplorer	http://lpcsexplorer.cr.usgs.gov	LPCS
exports.NODE_CWIC = "CWIC";
exports.NODE_EE = "EE";
exports.NODE_HDDS= "HDDS";
exports.NODE_LPCS = "LPCS";

//constants for standardizing inputs for api and default values
//dataset name
  // Landsat 8
  exports.LANDSAT_8 = "LANDSAT_8";

  // Landsat 8 c1
  exports.LANDSAT_8_C1 = "LANDSAT_8_C1";


  //when Landsat 7 newer
  exports.LANDSAT_ETM_SLC_OFF = "LANDSAT_ETM_SLC_OFF";

  //when Landsat 7 newer C1
  exports.LANDSAT_ETM_C1 = "LANDSAT_ETM_C1";

  //when Landsat 4-5 newer C1
  exports.LANDSAT_TM_C1 = "LANDSAT_TM_C1";

  //when Landsat 7 older
  exports.LANDSAT_ETM = "LANDSAT_ETM";
  //when Landsat 5
  exports.LANDSAT_TM = "LANDSAT_TM";

//download products
exports.PRODUCTS = ["STANDARD"];

//for grid2ll
exports.GRIDTYPE_WRS1 = "WRS1";
exports.GRIDTYPE_WRS2 = "WRS2";
exports.RESPONSEHAPE_POINT = 'POINT';
exports.RESPONSEHAPE_POLYGON = 'POLYGON';

//down media default for us
exports.OUTPUT_MEDIA_DWNLD = "DWNLD";


// slc is off when the image is before may 5th 2003
exports.SLC_ONFF_DATE = new Date("2003-05-31");

//c1 data for eros data
exports.C1_DATA_DATE = new Date("2017-04-30");

exports.LANDSAT_DATASETS = [
  exports.LANDSAT_8,
  exports.LANDSAT_8_C1,
  exports.LANDSAT_ETM_C1,
  exports.LANDSAT_ETM_SLC_OFF,
  exports.LANDSAT_ETM,
  exports.LANDSAT_TM,
  exports.LANDSAT_TM_C1
]
