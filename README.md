# landsatfact_usgs_json_api

Landsat FACT - USGS JSON api interface (node.js)

* [setup and install](#setup)
* [configuration](#configuration)
* [running](#running)
* [testing](#testing)
* [logging](#logging)

## setup
To install clone and npm install

Clone
```bash
git clone git@github.com:nemac/landsatfact_usgs_json_api.git
```

then
```bash
$cd landsatfact_usgs_json_api
```

then install
```bash
npm install
```

## configuration
you will need to have four config files....
* [email](#1-email)
* [postgres](#2-postgres)
* [USGS](#3-usgs)
* [metadata](#4-metadata)

### 1. email
* needs to be located in the directory: ./lib/email/
* name: config.yaml
* note: you will need to get the app authenticated with gmail for this to work.
a great example on how to do this can be found here: http://masashi-k.blogspot.com/2013/06/sending-mail-with-gmail-using-xoauth2.html
* this is not in github because it contains sensitive information so you will have to create this yourself

```yaml
username: <your email>@gmail.com
clientId: <your client id>.apps.googleusercontent.com
clientSecret: <your client secert>
refreshToken: <refresh token>
accessToken: <access token>
to_email_list: <comma delemited email reciepents>
```

### 2. postgres
* located in the directory: ./lib/postgres/
* name: config.yaml
* this is not in github because it contains sensitive information so you will have to create this yourself

```yaml
host: <your postgres hotname>
database: <the postrgres database name>
user: <the postgres database user name>
password: <the postgres database password>
port: <this postgres port number usually 5432>
idleTimeoutMillis: 10000
max: 10
```

### 3. USGS
#### config.yaml
* located in the directory: ./lib/usgs_api/
* name: config.yaml
* note: requires machine to machine access contact usgs to get this access.
* this is not in github because it contains sensitive information so you will have to create this yourself

Change the following to match your system
* download_directory
* download_text
* download_lcv_text

```yaml
username: <usgs machine to machine user name>
password: <usgs machine to machine password>
download_directory: ./downloads/
download_text: ./
download_lcv_text: ../project/dataexchange/
```

### then you need the overall config
#### 4. metadata
* this is in github the default settings are here [config/metadata.yaml](config/metadata.yaml)
* This helps determine how we create the metadata in our database.  This maps the USGS metadata JSON fields to our database fields. This also documents  how we calculate the values.

```yaml
metadata_from_days_ago: 10
metadata_datasets:
- datasetName: LANDSAT_8
  fieldId: fieldId
  datasetFilterType: and
  fields:
  - fieldName: WRS Path
    fieldFilterType: between
    fieldValues:
      - value: 13
      - value: 33
  - fieldName: WRS Row
    fieldFilterType: between
    fieldValues:
      - value: 33
      - value: 43
  metdataFields:
  - field:
    - fieldName: Landsat Scene Identifier
      databaseFieldName: scene_id
      method: api
  - field:
    - fieldName: OLI_TIRS
      databaseFieldName: sensor
      method: constant
  - field:
    - fieldName: Date Acquired
      databaseFieldName: acquisition_date
      method: api
  - field:
    - fieldName: url
      databaseFieldName: browse_url
      method: api_browse
  - field:
    - fieldName: WRS Path
      databaseFieldName: path
      method: api
  - field:
    - fieldName: WRS Row
      databaseFieldName: row
      method: api
  - field:
    - fieldName: Scene Cloud Cover
      databaseFieldName: cc_full
      method: api
  - field:
    - fieldName: 0
      databaseFieldName:  cc_quad_ul
      method: constant
  - field:
    - fieldName: 0
      databaseFieldName: cc_quad_ur
      method: constant
  - field:
    - fieldName: 0
      databaseFieldName: cc_quad_ll
      method: constant
  - field:
    - fieldName: 0
      databaseFieldName: cc_quad_lr
      method: constant
  - field:
    - fieldName: Data Type Level 1
      databaseFieldName: data_type_l1
      method: api
  - field:
    - fieldName: 999999
      databaseFieldName: l1_key
      method: constant
- datasetName: LANDSAT_ETM
  fieldId: fieldId
  datasetFilterType: and
  fields:
  - fieldName: WRS Path
    fieldFilterType: between
    fieldValues:
      - value: 13
      - value: 33
  - fieldName: WRS Row
    fieldFilterType: between
    fieldValues:
      - value: 33
      - value: 43
  metdataFields:
  - field:
    - fieldName: Landsat Scene Identifier
      databaseFieldName: scene_id
      method: api
  - field:
    - fieldName: LANDSAT_ETM
      databaseFieldName: sensor
      method: constant
  - field:
    - fieldName: Date Acquired
      databaseFieldName: acquisition_date
      method: api
  - field:
    - fieldName: url
      databaseFieldName: browse_url
      method: api_browse
  - field:
    - fieldName: WRS Path
      databaseFieldName: path
      method: api
  - field:
    - fieldName: WRS Row
      databaseFieldName: row
      method: api
  - field:
    - fieldName: Cloud Cover
      databaseFieldName: cc_full
      method: api
  - field:
    - fieldName: Cloud Cover Quad Upper Left
      databaseFieldName:  cc_quad_ul
      method: api
  - field:
    - fieldName: Cloud Cover Quad Upper Right
      databaseFieldName: cc_quad_ur
      method: api
  - field:
    - fieldName: Cloud Cover Quad Lower Left
      databaseFieldName: cc_quad_ll
      method: api
  - field:
    - fieldName: Cloud Cover Quad Lower Right
      databaseFieldName: cc_quad_lr
      method: api
  - field:
    - fieldName: Data Type Level 1
      databaseFieldName: data_type_l1
      method: api
  - field:
    - fieldName: 999999
      databaseFieldName: l1_key
      method: constant
- datasetName: LANDSAT_ETM_SLC_OFF
  fieldId: fieldId
  datasetFilterType: and
  fields:
  - fieldName: WRS Path
    fieldFilterType: between
    fieldValues:
      - value: 13
      - value: 33
  - fieldName: WRS Row
    fieldFilterType: between
    fieldValues:
      - value: 33
      - value: 43
  metdataFields:
  - field:
    - fieldName: Landsat Scene Identifier
      databaseFieldName: scene_id
      method: api
  - field:
    - fieldName: LANDSAT_ETM_SLC_OFF
      databaseFieldName: sensor
      method: constant
  - field:
    - fieldName: Date Acquired
      databaseFieldName: acquisition_date
      method: api
  - field:
    - fieldName: url
      databaseFieldName: browse_url
      method: api_browse
  - field:
    - fieldName: WRS Path
      databaseFieldName: path
      method: api
  - field:
    - fieldName: WRS Row
      databaseFieldName: row
      method: api
  - field:
    - fieldName: Cloud Cover
      databaseFieldName: cc_full
      method: api
  - field:
    - fieldName: Cloud Cover Quad Upper Left
      databaseFieldName:  cc_quad_ul
      method: api
  - field:
    - fieldName: Cloud Cover Quad Upper Right
      databaseFieldName: cc_quad_ur
      method: api
  - field:
    - fieldName: Cloud Cover Quad Lower Left
      databaseFieldName: cc_quad_ll
      method: api
  - field:
    - fieldName: Cloud Cover Quad Lower Right
      databaseFieldName: cc_quad_lr
      method: api
  - field:
    - fieldName: Data Type Level 1
      databaseFieldName: data_type_l1
      method: api
  - field:
    - fieldName: 999999
      databaseFieldName: l1_key
      method: constant
- datasetName: LANDSAT_TM
  fieldId: fieldId
  datasetFilterType: and
  fields:
  - fieldName: WRS Path
    fieldFilterType: between
    fieldValues:
      - value: 13
      - value: 33
  - fieldName: WRS Row
    fieldFilterType: between
    fieldValues:
      - value: 33
      - value: 43
  metdataFields:
  - field:
    - fieldName: Landsat Scene Identifier
      databaseFieldName: scene_id
      method: api
  - field:
    - fieldName: LANDSAT_TM
      databaseFieldName: sensor
      method: constant
  - field:
    - fieldName: Date Acquired
      databaseFieldName: acquisition_date
      method: api
  - field:
    - fieldName: url
      databaseFieldName: browse_url
      method: api_browse
  - field:
    - fieldName: WRS Path
      databaseFieldName: path
      method: api
  - field:
    - fieldName: WRS Row
      databaseFieldName: row
      method: api
  - field:
    - fieldName: Cloud Cover
      databaseFieldName: cc_full
      method: api
  - field:
    - fieldName: Cloud Cover Quad Upper Left
      databaseFieldName:  cc_quad_ul
      method: api
  - field:
    - fieldName: Cloud Cover Quad Upper Right
      databaseFieldName: cc_quad_ur
      method: api
  - field:
    - fieldName: Cloud Cover Quad Lower Left
      databaseFieldName: cc_quad_ll
      method: api
  - field:
    - fieldName: Cloud Cover Quad Lower Right
      databaseFieldName: cc_quad_lr
      method: api
  - field:
    - fieldName: Data Type Level 1
      databaseFieldName: data_type_l1
      method: api
  - field:
    - fieldName: 999999
      databaseFieldName: l1_key
      method: constant
database:
  - json_field:
    database_field:
  - json_field:
    database_field:
```


*metadata_from_days_ago* is standalone defines how many days to pull data from.  Starting from today

*metadata_datasets* the base object for all the metadata
* *datasetName* datasetName the datasetName as defined by USGS

 the *datasetname* there is filter we have to pull and it is different for each datasetName.  This makes sure we pull only the rows and paths we are interested in.

  The next items define the additionalCriteria in the [Search Request](http://earthexplorer.usgs.gov/inventory/documentation/json-api#search).  This is were we limit by row and path.  The field id for path and row is different for each datasetName, so we have to get them defined for each datasetName.

  The additionalCriteria is defined by *fieldId*, *datasetFilterType*, *fields*, *fields*, *fieldName*, *fieldFilterType*, *fieldValues*, *value*, *value*.  here is sample request demonstrating a full request for a Landsat 8 scene:
 ```json
 {
 	"node": "EE",
 	"datasetName": "LANDSAT_8",
 	"lowerLeft": {},
 	"upperRight": {},
 	"startDate": "2016-08-27T20:26:39.063Z",
 	"endDate": "2016-09-06T20:26:39.063Z",
 	"months": null,
 	"includeUnknownCloudCover": true,
 	"minCloudCover": 0,
 	"maxCloudCover": 100,
 	"additionalCriteria": {
 		"filterType": "and",
 		"childFilters": [{
 			"filterType": "between",
 			"fieldId": "10036",
 			"firstValue": 13,
 			"secondValue": 33
 		}, {
 			"filterType": "between",
 			"fieldId": "10038",
 			"firstValue": 33,
 			"secondValue": 43
 		}]
 	},
 	"maxResults": 20,
 	"startingNumber": 1,
 	"sortOrder": "ASC"
 }
 ```

Next is the object *metdataFields*.  This maps a metadata field to a database field.  This also defines how to calculate the values that will be inserted into the database. and is an object with three keys:
*field*:
    *fieldName*: the field name in response from USGS
    *databaseFieldName*: the field name in our database
    *method*: method to calculate the value

The metadata is returned as xml but converted to a JSON object
an example of the xml response is at http://earthexplorer.usgs.gov/metadata/xml/4923/LC80130292014100LGN00

#### the three methods
* method: api  get the value from JSON response.  The value is held in the JSON response with field name defined in fieldName
* method: api_browse  the value is the browse url
* method: constant value is obtained with the value held in the fieldName in metadata.yaml file

# running
there are three main programs.

## update_landsat_metadata.js
updates the Landsat data into the metadata table in the postgres database.

## download_landsat_data.js
downloads the actual Landsat imagery data and extracts it, so it is ready for processing.  This program is dual purpose, you can also pass it a scene and download only that scene. This is used to process custom requests.

if no arguments are passed then we process everything in the last_day_scenes plus anything that failed previous
creaetes logs of faulres sends emails. logs stored ./logs

## usgs_cli.js
can run usgs commands from command  line with request in line or from a text (JSON) file.  mainly great for testing

here are the options:
```bash
Usage: usgs_cli [options]

Options:

  -h, --help                         output usage information
  -V, --version                      output the version number
  -r, --request_code <request code>  request code see http://earthexplorer.usgs.gov/inventory/documentation/json-api for valide codes
  -q, --request_json <json text>     request json as text
  -f, --request_file <json file>     request json in text <file>
```

get metadata for a Landsat 8 scene LC80130292014100LGN00 using the request method.

```bash
 node usgs_cli.js -r metadata -q '{"datasetName": "LANDSAT_8","node": "EE","entityIds": ["LC80130292014100LGN00"]}'
```

this is should print a response of

```bash
[{"acquisitionDate":"2014-04-10","startTime":"2014-04-10","endTime":"2014-04-10","lowerLeftCoordinate":{"latitude":43.95287,"longitude":-73.38717},"upperLeftCoordinate":{"latitude":45.66895,"longitude":-72.81323},"upperRightCoordinate":{"latitude":45.24376,"longitude":-70.44335},"lowerRightCoordinate":{"latitude":43.53155,"longitude":-71.0851},"sceneBounds":"-73.38717,43.53155,-70.44335,45.66895","browseUrl":"http://earthexplorer.usgs.gov/browse/landsat_8/2014/013/029/LC80130292014100LGN00.jpg","dataAccessUrl":"http://earthexplorer.usgs.gov/order/process?dataset_name=LANDSAT_8&ordered=LC80130292014100LGN00&node=INVSVC","downloadUrl":"http://earthexplorer.usgs.gov/download/external/options/LANDSAT_8/LC80130292014100LGN00/INVSVC/","entityId":"LC80130292014100LGN00","displayId":"LC80130292014100LGN00","metadataUrl":"http://earthexplorer.usgs.gov/metadata/xml/4923/LC80130292014100LGN00/","fgdcMetadataUrl":"http://earthexplorer.usgs.gov/fgdc/4923/LC80130292014100LGN00/save_xml","modifiedDate":"2016-04-25","orderUrl":"http://earthexplorer.usgs.gov/order/process?dataset_name=LANDSAT_8&ordered=LC80130292014100LGN00&node=INVSVC","bulkOrdered":false,"ordered":false,"summary":"Entity ID: LC80130292014100LGN00, Acquisition Date: 10-APR-14, Path: 13, Row: 29"}]
```

or do it with a json request file.
```bash
node usgs_cli.js -r metadata -f json/test-metadata-request.json
```
as part of the testing process we have a bunch of request json files located in the ./JSON directory.  

# logging
currently all code is logging for error level.  this means you we only see errors and important information in the logs.
logs are ./log download_directory
logs are kept for 7 days
emails are sent for failures

# testing
testing using mocha we test the api results to make sure we getting good results to indicate for us a warning that the api has changed.

## testing examples

  ### checks for api calls
  ```bash
  ./node_modules/mocha/bin/mocha test/usgs_api_calls.js
  ```

  ### checks for api usgs helpers
  ```bash
  ./node_modules/mocha/bin/mocha test/usgs_helpers_test.js
  ```

  ...more to come.
