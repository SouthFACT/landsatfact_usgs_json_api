
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
