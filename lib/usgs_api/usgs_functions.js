module.exports = {

  //Clear Bulk Download Order
  //This method is used to clear any pending bulk download orders from the item basket.
  // Sample Response
  // This request does not have a response. Successful execution is assumed if no errors are thrown.

  //Request Parameters
  // datasetName
    // data type: string
    // default value:
    // required: No
    // usage: Identifies the dataset
    // Note: Use the datasetName from datasets response
    // api version: 1.0
  // apiKey
    // data type: string
    // default value:
    // required: Yes
    // usage: Users API Key/Authentication Token
    // Note: Obtained from login request
    // api version: 1.0
  // node
    // data type: string
    // default value:EE
    // required: Yes
    // usage: Determines the dataset catalog to use
    // Note:
    // api version: 1.0
   usgsapi_clearbulkdownloadorder: function(apiKey, node, datasetName){

    //all arguments need to be passed but can be passed undefined when optional these are the optional arguments
    datasetName = typeof datasetName !== 'undefined'  ? datasetName : null;
    //example data
    // {
    // 	"apiKey": "USERS API KEY",
    // 	"node": "EE",
    // 	"datasetName": "LANDSAT_8"
    // }
    return {
      apiKey,
    	node,
    	datasetName,
    }
  },



  // Clear Order
  // Method Description
  // This method is used to clear any pending orders from the item basket.
  //This request does not clear bulk download orders, to clear bulk download orders use clearBulkDownloadOrder.

  //Request Parameters
  // datasetName
      // data type: string
      // default value:
      // required: No
      // usage: Identifies the dataset
      // Note: Use the datasetName from datasets response
      // api version: 1.0
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value:EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0
  usgsapi_clearorder: function(apiKey, node, datasetName){

    //all arguments need to be passed but can be passed undefined when optional these are the optional arguments
    datasetName = typeof datasetName !== 'undefined'  ? datasetName : null;
    //example data
    // {
    // 	"apiKey": "USERS API KEY",
    // 	"node": "EE",
    // 	"datasetName": "LANDSAT_8"
    // }
    return {
      apiKey,
    	node,
    	datasetName,
    }
  },

  // Dataset Fields
  // Method Description
  // This request is used to return the metadata filter fields for the specified dataset.
  // These values can be used as additional criteria when submitting search and hit queries.

    //Request Parameters
    // datasetName
        // data type: string
        // default value:
        // required: No
        // usage: Identifies the dataset
        // Note:Use the datasetName from datasets response
        // api version: 1.0
    // apiKey
        // data type: string
        // default value:
        // required: Yes
        // usage: Users API Key/Authentication Token
        // Note:Obtained from login request
        // api version: 1.0
    // node
        // data type: string
        // default value:EE
        // required: Yes
        // usage: Determines the dataset catalog to use
        // Note:
        // api version: 1.0
  usgsapi_datasetfields: function(apiKey, node, datasetName){
    datasetName = typeof datasetName !== 'undefined'  ? datasetName : null;

    return {
      apiKey,
    	node,
    	datasetName,
    }
  },



  // Dataset Search
  // Method Description
  // This method is used to find datasets available for searching. By passing no parameters except node,
  // all available datasets are returned. Additional parameters such as temporal range and
  // spatial bounding box can be used to find datasets that provide more specific data.
  // The dataset name parameter can be used to limit the results based on matching the
  // supplied value against the public dataset name with assumed wildcards at the beginning and end.

  //Request Parameters
  // datasetName
      // data type: string
      // default value:
      // required: No
      // usage: Identifies the dataset
      // Note:Use the datasetName from datasets response
      // api version: 1.0
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note:Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value: EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0
  // lowerLeft
      // data type: Service_Class_Coordinate
      // default value: No Bounds (if omitted from request)
      // required: No
      // usage: When used in conjunction with upperRight, creates a bounding box to search spatially.
      // Note: Coordinates are assumed in decimal degrees in EPSG:4326 projection
      // api version: 1.0
  // upperRight
      // data type: Service_Class_Coordinate
      // default value:
      // required: No Bounds(if omitted from request)
      // required: No
      // usage: When used in conjunction with lowerLeft, creates a bounding box to search spatially.
      // Note: Coordinates are assumed in decimal degrees in EPSG:4326 projection
      // api version: 1.0
  // startDate
      // data type: string
      // default value: 1920-01-01
      // required: No
      // usage: Used to search datasets temporally for possible dataset coverage
      // Note: ISO 8601 Formatted Date  Time portion is ignored
      // api version: 1.0
  // endDate
      // data type: string
      // default value: 2016-08-30
      // required: No
      // usage: Used to search datasets temporally for possible dataset coverage
      // Note: ISO 8601 Formatted Date Time portion is ignored
      // api version: 1.0
  usgsapi_datasets: function(apiKey, node, datasetName, lowerLeft, upperRight, startDate, endDate){
    datasetName = typeof datasetName !== 'undefined'  ? datasetName : null;
    lowerLeft = typeof lowerLeft !== 'undefined'  ? lowerLeft : {};
    upperRight = typeof upperRight !== 'undefined' ? upperRight : {};
    startDate = typeof startDate !== 'undefined' ? startDate : '1920-01-01';
    endDate = typeof endDate !== 'undefined' ? endDate : '2016-08-30';
    // example request
    // {
    // 	"datasetName": "L8",
    // 	"lowerLeft": {
    // 		"latitude": 44.60847,
    // 		"longitude": -99.69639
    // 	},
    // 	"upperRight": {
    // 		"latitude": 44.60847,
    // 		"longitude": -99.69639
    // 	},
    // 	"startDate": "2014-10-01",
    // 	"endDate": "2014-10-01",
    // 	"apiKey": "USERS API KEY",
    // 	"node": "EE"
    // }

    return {
      apiKey,
    	node,
    	datasetName,
    	lowerLeft,
    	upperRight,
    	startDate,
    	endDate,
    }
  },



  // Download
  // Method Description
  // The download request is used to generate a list of direct download URL's for data.
  // To get available products, submit a downloadOptions request.
  // All unavailable or invalid products are automatically excluded from the response.
  //
  // This request implements a rate limit on unattempted downloads.
  // Download authorization records are created as a result of this request with the intent that the user will
  // download the data before submitting subsequent requests.
  // The rate limit is defined by 10 unattampted downloads within the last 10 minutes.

  //Request Parameters
  // datasetName
      // data type: string
      // default value:
      // required: Yes
      // usage: Identifies the dataset
      // Note:Use the datasetName from datasets response
      // api version: 1.0
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value: EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0
  // products
      // data type: sstring[]
      // default value: []
      // required: Yes
      // usage: Identifies a product name
      // Note: List of distinct values that apply to entire scene list
      // api version: 1.0
  // entityIds
      // data type: sstring[]
      // default value: []
      // required: Yes
      // usage: Identifies scenes to get downloads for
      // Note: Maximum list size - 50,000
      // api version: 1.0
  usgsapi_download:function(apiKey, node, datasetName, products, entityIds){
    //example request
    // {
    // 	"datasetName": "LANDSAT_8",
    // 	"apiKey": "USERS API KEY",
    // 	"node": "EE",
    // 	"entityIds": ["LC80130292014100LGN00"],
    // 	"products": ["STANDARD"]
    // }
    products = typeof products !== 'undefined' ? products : ["STANDARD"];

    return {
      apiKey,
    	node,
    	datasetName,
    	products,
    	entityIds,
    }
  },



  // Download Options
  // Method Description
  // The download options request is used to discover downloadable products for each dataset.
  // If a download is marked as not available, an order must be placed to generate that product.

  //Request Parameters
  // datasetName
      // data type: string
      // default value:
      // required: Yes
      // usage: Identifies the dataset
      // Note:Use the datasetName from datasets response
      // api version: 1.0
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value: EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0
  // entityIds
      // data type: string[]
      // default value: []
      // required: Yes
      // usage: Identifies scenes to get downloads options for
      // Note:Required if entityId is not used  Maximum list size - 50,000
      // api version: 1.0
  // machineOnly
      // data type: boolean
      // default value: true
      // required: No
      // usage: Return machine processable (non-file) downloads only
      // Note:By setting to false your results may include downloads that may require web authentication or other special, non-machine friendly, circumstances
      // api version: 1.0
  usgsapi_downloadoptions: function(apiKey, node, datasetName, entityIds, machineOnly){
    machineOnly = typeof machineOnly !== 'undefined' ? machineOnly : true;

    //example request
    // {
    // 	"datasetName": "LANDSAT_8",
    // 	"apiKey": "USERS API KEY",
    // 	"node": "EE",
    //  machineOnly: true
    // 	"entityIds": ["LC80130292014100LGN00"]
    // }
    return {
      apiKey,
    	node,
    	datasetName,
    	machineOnly,
    	entityIds,
    }
  },


  // Get Bulk Download Products
  // Method Description
  // The use of this request is to retrieve bulk download products on a scene-by-scene basis.

  //Request Parameters
  // datasetName
      // data type: string
      // default value:
      // required: Yes
      // usage: Identifies the dataset
      // Note:Use the datasetName from datasets response
      // api version: 1.0
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value: EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0
  // entityIds
      // data type: string[]
      // default value: []
      // required: Yes
      // usage: Identifies scenes to get downloads options for
      // Note:Required if entityId is not used  Maximum list size - 50,000
      // api version: 1.0
  usgsapi_getbulkdownloadproducts: function(apiKey, node, datasetName, entityIds){
    // {
    // 	"datasetName": "LANDSAT_8",
    // 	"apiKey": "USERS API KEY",
    // 	"node": "EE",
    // 	"entityIds": ["LC80130292014100LGN00"]
    // }
    return {
      apiKey,
    	node,
    	datasetName,
    	entityIds,
    }
  },



  // Get Order Products
  // Method Description
  // The use of this request is to retrieve orderable products on a scene-by-scene basis.

  //Request Parameters
  // datasetName
      // data type: string
      // default value:
      // required: Yes
      // usage: Identifies the dataset
      // Note:Use the datasetName from datasets response
      // api version: 1.0
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value: EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0
  // entityIds
      // data type: string[]
      // default value: []
      // required: Yes
      // usage: Identifies scenes to get downloads options for
      // Note: Required if entityId is not used  Maximum list size - 50,000
      // api version: 1.0
  usgsapi_getorderproducts: function(apiKey, node, datasetName, entityIds){
    // {
    // 	"datasetName": "LANDSAT_8",
    // 	"apiKey": "USERS API KEY",
    // 	"node": "EE",
    // 	"entityIds": ["LC80130292014100LGN00"]
    // }
    return {
      apiKey,
    	node,
    	datasetName,
    	entityIds,
    }
  },

  // Grid to Lat/Lng
  // Method Description
  // This method is used to convert the following grid systems to lat/lng center points or polygons:
  //    WRS-1, WRS-2. To account for multiple grid systems there are required fields for all
  // grids (see "Required Request Parameters") as well as grid-specific parameters.

  //Request Parameters
  // gridType
      // data type: string
      // default value:
      // required: Yes
      // usage: Identifies the grid system
      // Note: Accepted values: 'WRS1' and 'WRS2'
      // api version: 1.2
  // responseShape
      // data type: string
      // default value:
      // required: Yes
      // usage: Determines if the response should be a center point or outer polygon
      // Note: Accepted values: 'point' and 'polygon'
      // api version: 1.2
  // path
      // data type: int
      // default value:
      // required: Yes
      // usage: WRS Path
      // Note:
      // api version: 1.2
  // row
      // data type: int
      // default value:
      // required: Yes
      // usage: WRS Row
      // Note:
      // api version: 1.2
  usgsapi_grid2ll: function(gridType, responseShape, path, row){
    // {
    //     "gridType": "WRS1",
    //     "responseShape": "polygon",
    //     "path": 1,
    //     "row": 1
    // }
    return {
    	gridType,
    	responseShape,
    	path,
    	row
    }
  },

  // Item Basket
  // Method Description
  // This method returns the current item basket for the current user.

  //Request Parameters
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  usgsapi_itembasket: function(apiKey){
    // {
    // 	"apiKey": "USERS API KEY"
    // }
    return {
    	apiKey
    }
  },



  // Login
  // Method Description
  // This method requires SSL be used due to the sensitive nature of users passwords.
  //
  // Upon a successful login, an API key will be returned.
  // This key will be active for one hour and should be destroyed upon final use of the service by calling the logout method.
  // Users must have "Machine to Machine" access, which is established in the

  //Request Parameters
  // username
      // data type: string
      // default value:
      // required: Yes
      // usage: Your USGS registration username
      // Note:
      // api version: 1.0
  // password
      // data type: string
      // default value:
      // required: Yes
      // usage: Your USGS registration password
      // Note:
      // api version: 1.0
  // authType
      // data type: string
      // default value:
      // required: No
      // usage: 'EROS'
      // Note: This parameter should only be used if a user is directed to do so (Internal Use Only)
      // api version: 1.0
  usgsapi_login: function(username, password, authType){
    //   {
    //     "username": "username",
    //     "password": "password",
    //     "authType": "EROS"
    // }

    //all arguments need to be passed but can be passed undefined when optional these are the optional arguments
    authType = typeof authType !== 'undefined'  ? datasetName : "EROS";

    return {
      username,
      password,
      authType,
    }
  },


  // Logout
  // Method Description
  // This method requires SSL be used due to the sensitive nature of users passwords.
  //
  // This method is used to remove the users API key from being used in the future.  };

  //Request Parameters
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  usgsapi_logout: function(apiKey){
    // {
    // 	"apiKey": "USERS API KEY"
    // }
    return {
    	apiKey
    }
  },



  // Remove Bulk Download Scene
  // Method Description
  // The use of this request is to remove scenes, on a scene-by-scene basis from the bulk download order item basket.

  //Request Parameters
  // datasetName
      // data type: string
      // default value:
      // required: No
      // usage: Identifies the dataset
      // Note:Use the datasetName from datasets response
      // api version: 1.0
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value: EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0
  // entityIds
      // data type: string[]
      // default value: []
      // required: Yes
      // usage: Identifies scenes to get downloads options for
      // Note: Required if entityId is not used  Maximum list size - 50,000
      // api version: 1.0
  usgsapi_removebulkdownloadscene: function(apiKey, node, datasetName, entityIds){
    // {
    // 	"apiKey": "USERS API KEY",
    // 	"datasetName": "LANDSAT_8",
    // 	"node": "EE",
    // 	"entityIds": ["LC80130292014100LGN00","LC80130282014100LGN00"]
    // }
    return {
      apiKey,
    	node,
    	datasetName,
    	entityIds,
    }
  },

  // Remove Order Scene
  // Method Description
  // The use of this request is to remove scenes, on a scene-by-scene basis from the order item basket.

  //Request Parameters
  // datasetName
      // data type: string
      // default value:
      // required: Yes
      // usage: Identifies the dataset
      // Note:Use the datasetName from datasets response
      // api version: 1.0
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value: EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0
  // entityIds
      // data type: string[]
      // default value: []
      // required: Yes
      // usage: Identifies scenes to get downloads options for
      // Note: Required if entityId is not used  Maximum list size - 50,000
      // api version: 1.0
  usgsapi_removeorderscene: function(apiKey, node, datasetName, entityIds){
    // {
    // 	"apiKey": "USERS API KEY",
    // 	"datasetName": "LANDSAT_8",
    // 	"node": "EE",
    // 	"entityIds": ["LC80130292014100LGN00","LC80130282014100LGN00"]
    // }
    return {
      apiKey,
    	node,
    	datasetName,
    	entityIds,
    }
  },



  // Scene Metadata
  // Method Description
  // The use of the metadata request is intended for those who have acquired scene IDs from a different source.
  // It will return the same metadata that is available via the search request.

  //Request Parameters
  // datasetName
      // data type: string
      // default value:
      // required: Yes
      // usage: Identifies the dataset
      // Note:Use the datasetName from datasets response
      // api version: 1.0
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value: EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0
  // entityIds
      // data type: string[]
      // default value: []
      // required: Yes
      // usage: Identifies scenes to get downloads options for
      // Note: Required if entityId is not used  Maximum list size - 50,000
      // api version: 1.0

  usgsapi_metadata: function(apiKey, node, datasetName, entityIds){
    // {
    // 	"apiKey": "USERS API KEY",
    // 	"datasetName": "LANDSAT_8",
    // 	"node": "EE",
    // 	"entityIds": ["LC80130292014100LGN00"]
    // }
    return {
      apiKey,
    	node,
    	datasetName,
    	entityIds,
    }
  },

  // Scene Search
  // Method Description
  // Searching is done with limited search criteria. All coordinates are assumed decimal-degree format.
  // If lowerLeft or upperRight are supplied, then both must exist in the request to complete the bounding box.
  // Starting and ending dates, if supplied, are used as a range to search data based on acquisition dates.
  // The current implementation will only search at the date level, discarding any time information.
  // If data in a given dataset is composite data, or data acquired over multiple days,
  // a search will be done to match any intersection of the acquisition range.
  // There currently is a 50,000 scene limit for the number of results that are returned, however,
  // some client applications may encounter timeouts for large result sets for some datasets.
  //
  // To use the additional criteria field, pass one of the four search filter objects
  // (SearchFilterAnd, SearchFilterBetween, SearchFilterOr, SearchFilterValue) in JSON format
  // with additionalCriteria being the root element of the object.

  //Request Parameters
  // datasetName
      // data type: string
      // default value:
      // required: Yes
      // usage: Identifies the dataset
      // Note:Use the datasetName from datasets response
      // api version: 1.0
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value: EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0
  // lowerLeft
    // data type: Service_Class_Coordinate
    // default value: No Bounds (if omitted from request)
    // required: No
    // usage: When used in conjunction with upperRight, creates a bounding box to search spatially.
    // Note: Coordinates are assumed in decimal degrees in EPSG:4326 projection
    // api version: 1.0
  // upperRight
    // data type: ervice_Class_Coordinate
    // default value: No Bounds(if omitted from request)
    // required: No
    // usage: When used in conjunction with lowerLeft, creates a bounding box to search spatially.
    // Note: Coordinates are assumed in decimal degrees in EPSG:4326 projection
    // api version: 1.0
  // startDate
    // data type: string
    // default value: 1920-01-01
    // required: No
    // usage: Used to search the dataset temporally to discover scenes
    // Note: ISO 8601 Formatted Date Time portion is ignored
    // api version: 1.0
  // endDate
    // data type: string
    // default value: 2016-08-30
    // required: No
    // usage: Used to search the dataset temporally to discover scenes
    // Note: ISO 8601 Formatted Date Time portion is ignored
    // api version: 1.0
  // months
    // data type: int[]
    // default value: All Months
    // required: No
    // usage: Used to limit results to specific months
    // Note: Valid values are [1,12]
    // api version: 1.0
  // includeUnknownCloudCover
    // data type: boolean
    // default value: true
    // required: No
    // usage: Used to determine if scenes with unknown cloud cover values should be included in the results
    // Note:
    // api version: 1.1
  // minCloudCover
    // data type: int
    // default value: 0
    // required: No
    // usage: Used to limit results by minimum cloud cover (for supported datasets)
    // Note: Valid values are [0, 100]
    // api version: 1.1
  // maxCloudCover
    // data type: int
    // default value: 100
    // required: No
    // usage: Used to limit results by maximum cloud cover (for supported datasets)
    // Note: Valid values are [0, 100]
    // api version: 1.1
  // additionalCriteria
    // data type: Service_Inventory_SearchFilter
    // default value: No Criteria (if omitted from request)
    // required: No
    // usage: Used to filter results based on dataset specific metadata fields
    // Note: Use datasetFields request to determine available fields and options
    // api version: 1.0
  // maxResults
    // data type: integer
    // default value: 10
    // required: No
    // usage: Used to determine the number of results to return
    // Note: Use with startingNumber for controlled pagination  Maximum	list size - 50,000
    // api version: 1.0
  // startingNumber
    // data type: integer
    // default value: 1
    // required: No
    // usage: Used to determine the result number to start returning from
    // Note: Use with maxResults for controlled pagination
    // api version: 1.0
  // sortOrder
    // data type: string
    // default value: ASC
    // required: No
    // usage: Used to order results based on acquisition date
    // Note:
    // api version: 1.0
  usgsapi_search: function(apiKey, node, datasetName, lowerLeft, upperRight , startDate, endDate,
                                months, includeUnknownCloudCover, minCloudCover,
                                 maxCloudCover, additionalCriteria, maxResults, startingNumber,
                                 sortOrder){

    lowerLeft = typeof lowerLeft !== 'undefined'  ? lowerLeft : {};
    upperRight = typeof upperRight !== 'undefined' ? upperRight : {};
    startDate = typeof startDate !== 'undefined' ? startDate : '1920-01-01';
    endDate = typeof endDate !== 'undefined' ? endDate : '2016-08-30';
    months = typeof months !== 'undefined' ? months : null;
    includeUnknownCloudCover = typeof includeUnknownCloudCover !== 'undefined' ? includeUnknownCloudCover : true;
    minCloudCover = typeof minCloudCover !== 'undefined' ? minCloudCover : 0;
    maxCloudCover = typeof maxCloudCover !== 'undefined' ? maxCloudCover : 100;
    additionalCriteria = typeof additionalCriteria !== 'undefined' ? additionalCriteria : null;
    maxResults = typeof maxResults !== 'undefined' ? maxResults : 10;
    startingNumber = typeof startingNumber !== 'undefined' ? startingNumber : 1;
    sortOrder = typeof sortOrder !== 'undefined' ? sortOrder : 'ASC';
    node = typeof node !== 'undefined' ? node : 'EE';


    // limited example {
    // 	"datasetName": "GLS2005",
    // 	"lowerLeft": {
    // 		"latitude": 75,
    // 		"longitude": -135
    // 	},
    // 	"upperRight": {
    // 		"latitude": 90,
    // 		"longitude": -120
    // 	},
    // 	"startDate": "2006-01-01",
    // 	"endDate": "2007-12-01",
    // 	"node": "EE",
    // 	"maxResults": 3,
    // 	"startingNumber": 1,
    // 	"sortOrder": "ASC",
    // 	"apiKey": "USERS API KEY"
    // }
    return {
      apiKey,
    	node,
    	datasetName,
    	lowerLeft,
    	upperRight,
    	startDate,
    	endDate,
      months,
      includeUnknownCloudCover,
      minCloudCover,
      maxCloudCover,
      additionalCriteria,
      maxResults,
      startingNumber,
      sortOrder,
    }
  },


  // Scene Search Hits
  // Method Description
  // This method is used in determining the number of hits a search returns. Because a hits request requires a search,
  // this request takes the same parameters as the search request, with exception to the non-search-field parameters; maxResults,
  // startingNumber, and sortOrder.

  //Request Parameters
  // datasetName
      // data type: string
      // default value:
      // required: Yes
      // usage: Identifies the dataset
      // Note:Use the datasetName from datasets response
      // api version: 1.0
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value: EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0
  // lowerLeft
    // data type: Service_Class_Coordinate
    // default value: No Bounds (if omitted from request)
    // required: No
    // usage: When used in conjunction with upperRight, creates a bounding box to search spatially.
    // Note: Coordinates are assumed in decimal degrees in EPSG:4326 projection
    // api version: 1.0
  // upperRight
    // data type: ervice_Class_Coordinate
    // default value: No Bounds(if omitted from request)
    // required: No
    // usage: When used in conjunction with lowerLeft, creates a bounding box to search spatially.
    // Note: Coordinates are assumed in decimal degrees in EPSG:4326 projection
    // api version: 1.0
  // startDate
    // data type: string
    // default value: 1920-01-01
    // required: No
    // usage: Used to search the dataset temporally to discover scenes
    // Note: ISO 8601 Formatted Date Time portion is ignored
    // api version: 1.0
  // endDate
    // data type: string
    // default value: 2016-08-30
    // required: No
    // usage: Used to search the dataset temporally to discover scenes
    // Note: ISO 8601 Formatted Date Time portion is ignored
    // api version: 1.0
  // months
    // data type: int[]
    // default value: All Months
    // required: No
    // usage: Used to limit results to specific months
    // Note: Valid values are [1,12]
    // api version: 1.0
  // includeUnknownCloudCover
    // data type: boolean
    // default value: true
    // required: No
    // usage: Used to determine if scenes with unknown cloud cover values should be included in the results
    // Note:
    // api version: 1.1
  // minCloudCover
    // data type: int
    // default value: 0
    // required: No
    // usage: Used to limit results by minimum cloud cover (for supported datasets)
    // Note: Valid values are [0, 100]
    // api version: 1.1
  // maxCloudCover
    // data type: int
    // default value: 100
    // required: No
    // usage: Used to limit results by maximum cloud cover (for supported datasets)
    // Note: Valid values are [0, 100]
    // api version: 1.1
  // additionalCriteria
    // data type: Service_Inventory_SearchFilter
    // default value: No Criteria (if omitted from request)
    // required: No
    // usage: Used to filter results based on dataset specific metadata fields
    // Note: Use datasetFields request to determine available fields and options
    // api version: 1.0

  usgsapi_hits: function(apiKey, node, datasetName, lowerLeft, upperRight , startDate, endDate,
                                months, includeUnknownCloudCover, minCloudCover,
                                 maxCloudCover, additionalCriteria){


      lowerLeft = typeof lowerLeft !== 'undefined'  ? lowerLeft : {};
      upperRight = typeof upperRight !== 'undefined' ? upperRight : {};
      startDate = typeof startDate !== 'undefined' ? startDate : '1920-01-01';
      endDate = typeof endDate !== 'undefined' ? endDate : '2016-08-30';
      months = typeof months !== 'undefined' ? months : null;
      includeUnknownCloudCover = typeof includeUnknownCloudCover !== 'undefined' ? includeUnknownCloudCover : true;
      minCloudCover = typeof minCloudCover !== 'undefined' ? minCloudCover : 0;
      maxCloudCover = typeof maxCloudCover !== 'undefined' ? maxCloudCover : 100;
      additionalCriteria = typeof additionalCriteria !== 'undefined' ? additionalCriteria : null;
      node = typeof node !== 'undefined' ? node : 'EE';

      return {
        apiKey,
      	node,
      	datasetName,
      	lowerLeft,
      	upperRight,
      	startDate,
      	endDate,
        months,
        includeUnknownCloudCover,
        minCloudCover,
        maxCloudCover,
        additionalCriteria,
      }
  },

  // Status
  // Method Description
  // This method is used to get the status of the API. There are no parameters available to call this method with.

  //Request Parameters
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0

  usgsapi_status: function(apiKey){
    // {
    // 	"apiKey": "USERS API KEY",
    // 	"node": "EE"
    // }
    return {
    	apiKey,ß
    }
  },



  // Submit Bulk Download Order
  // Method Description
  // This method is used to submit the current bulk download order in the item basket and returns the order id (order number)
  // for the submitted order.

  //Request Parameters
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value: EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0


  usgsapi_submitbulkdownloadorder: function(apiKey, node){
    // {
    // 	"apiKey": "USERS API KEY",
    // 	"node": "EE"
    // }
    return {
    	apiKey,
    	node,
    }
  },




  // Submit Order
  // Method Description
  // This method is used to submit the current order in the item basket and returns the order number for the submitted order.

  //Request Parameters
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value: EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0

  usgsapi_submitorder: function(apiKey, node){
    // {
    // 	"apiKey": "USERS API KEY",
    // 	"node": "EE"
    // }
    return {
    	apiKey,
    	node,
    }
  },



  // Update Bulk Download Scene
  // Method Description
  // This method is used to update the currently-selected products for a scene in the bulk download item basket.
  // The information needed for this request is obtained from the response of the getBulkDownloadProducts request.

  //Request Parameters
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value: EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0
  // datasetName
      // data type: string
      // default value:
      // required: Yes
      // usage: Identifies the dataset
      // Note: Use the datasetName from datasets response
      // api version: 1.0
  // downloadCodes
      // data type: string[]
      // default value:[]
      // required: Yes
      // usage: Identifies a list of products
      // Note: List of distinct values that apply to entire scene list
      // api version: 1.0
  // orderingId
      // data type: string
      // default value:
      // required: Yes
      // usage: Identifies a scenes to order
      // Note:
      // api version: 1.0

  usgsapi_updatebulkdownloadscene: function(apiKey, node, datasetName, downloadCodes, orderingId){
    // {
    // 	"apiKey": "USERS API KEY",
    // 	"node": "EE",
    // 	"datasetName": "LANDSAT_8",
    // 	"orderingId": "LC80130292014100LGN00",
    // 	"downloadCodes": ["STANDARD"]
    // }
    downloadCodes = typeof downloadCodes !== 'undefined' ? downloadCodes : ["STANDARD"];

    return {
      apiKey,
      node,
      datasetName,
      downloadCodes,
      orderingId,
    }
  },


  // Update Order Scene
  // Method Description
  // This method is used to update the currently-selected products for a scene in the order item basket.
  // The information needed for this request is obtained from the response of the getOrderProducts request.
  //
  // Please note that datasets may have individual ordering limits and that no order may exceed 1,000 scenes.

  //Request Parameters
  // apiKey
      // data type: string
      // default value:
      // required: Yes
      // usage: Users API Key/Authentication Token
      // Note: Obtained from login request
      // api version: 1.0
  // node
      // data type: string
      // default value: EE
      // required: Yes
      // usage: Determines the dataset catalog to use
      // Note:
      // api version: 1.0
  // datasetName
      // data type: string
      // default value:
      // required: Yes
      // usage: Identifies the dataset
      // Note: Use the datasetName from datasets response
      // api version: 1.0
  // productCode
      // data type: string
      // required: Yes
      // usage: Identifies the product to order
      // Note:
      // api version: 1.0
  // outputMedia
      // data type: string
      // required: Yes
      // usage: Identifies the output media of the product
      // Note:
      // api version: 1.0
  // option
      // data type: string
      // required: Yes
      // usage: Identifies any special processing parameters for the product
      // Note:
      // api version: 1.0
  // orderingId
      // data type: string
      // default value:
      // required: Yes
      // usage: Identifies a scenes to order
      // Note:
      // api version: 1.0


  usgsapi_updateorderscene: function(apiKey, node, datasetName, productCode, outputMedia, option, orderingId){
    // {
    // 	"apiKey": "USERS API KEY",
    // 	"node": "EE",
    // 	"datasetName": "LANDSAT_TM",
    // 	"orderingId": "LT50980761990085ASA00",
    // 	"productCode": "T273",
    // 	"option": "None",
    // 	"outputMedia": "DWNLD"
    // }
    return {
      apiKey,
      node,
      datasetName,
      productCode,
      outputMedia,
      option,
      orderingId,
    }
  },


}
