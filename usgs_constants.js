
exports.USGS_URL = 'https://earthexplorer.usgs.gov/inventory/json/';
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
  //when Landsat 7 newer
  exports.LANDSAT_ETM_SLC_OFF = "LANDSAT_ETM_SLC_OFF";
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

//USGS request codes constants
exports.USGS_REQUEST_CODE_CLEARBULKDOWNLOADORDER = 'clearbulkdownloadorder';
exports.USGS_REQUEST_CODE_CLEARORDER = 'clearorder';
exports.USGS_REQUEST_CODE_DATASETFIELDS = 'datasetfields';
exports.USGS_REQUEST_CODE_DATASETS = 'datasets';
exports.USGS_REQUEST_CODE_DOWNLOAD = 'download';
exports.USGS_REQUEST_CODE_DOWNLOADOPTIONS = 'downloadoptions';
exports.USGS_REQUEST_CODE_GETBULKDOWNLOADPRODUCTS = 'getbulkdownloadproducts';
exports.USGS_REQUEST_CODE_GETORDERPRODUCTS = 'getorderproducts';
exports.USGS_REQUEST_CODE_GRID2LL = 'grid2ll';
exports.USGS_REQUEST_CODE_ITEMBASKET = 'itembasket';
exports.USGS_REQUEST_CODE_LOGIN = 'login';
exports.USGS_REQUEST_CODE_LOGOUT = 'logout';
exports.USGS_REQUEST_CODE_REMOVEBULKDOWNLOADSCENE = 'removebulkdownloadscene';
exports.USGS_REQUEST_CODE_REMOVEORDERSCENE = 'removeorderscene';
exports.USGS_REQUEST_CODE_METADATA = 'metadata';
exports.USGS_REQUEST_CODE_SEARCH = 'search';
exports.USGS_REQUEST_CODE_HITS = 'hits';
exports.USGS_REQUEST_CODE_STATUS = 'status';
exports.USGS_REQUEST_CODE_SUBMITBULKDOWNLOADORDER = 'submitbulkdownloadorder';
exports.USGS_REQUEST_CODE_SUBMITORDER = 'submitorder';
exports.USGS_REQUEST_CODE_UPDATEBULKDOWNLOADSCENE = 'updatebulkdownloadscene';
exports.USGS_REQUEST_CODE_UPDATEORDERSCENE = 'updateorderscene';
