//get modules
const update_lsf_database = require("./lib/postgres/update_lsf_database.js");

update_lsf_database.query_db("select * from landsat_metadata where scene_id = $1::text",['LC80290352016250LGN00']);

const sql = 'INSERT INTO landsat_metadata(scene_id, sensor, acquisition_date, browse_url, path, row, cc_full, cc_quad_ul, cc_quad_ur, cc_quad_ll, cc_quad_lr, data_type_l1, l1_key)' +
                'VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)'

const parameters = [ 'LC80290352016250LGN00',
                'OLI_TIRS',
                'Tue Sep 06 2016',
                'http://earthexplorer.usgs.gov/browse/landsat_8/2016/029/035/LC80290352016250LGN00.jpg',
                29,
                35,
                9,
                null,
                null,
                null,
                null,
                'DAY',
                999999
              ];

// update_lsf_database.query_db(sql, parameters);

const fieldset  = [ { name: 'scene_id', value: 'test' },
  { name: 'sensor', value: 'OLI_TIRS' },
  { name: 'acquisition_date', value: '2016/08/30' },
  { name: 'browse_url', value: 'http://earthexplorer.usgs.gov/browse/landsat_8/2016/028/035/LC80280352016243LGN00.jpg' },
  { name: 'path', value: ' 028' },
  { name: 'row', value: ' 035' },
  { name: 'cc_full', value: '27.23' },
  { name: 'cc_quad_ul', value: 0 },
  { name: 'cc_quad_ur', value: 0 },
  { name: 'cc_quad_ll', value: 0 },
  { name: 'cc_quad_lr', value: 0 },
  { name: 'data_type_l1', value: 'L1T' },
  { name: 'l1_key', value: null },
 ]

update_lsf_database.metadata_to_db(fieldset);
//
//   scene_id: 'LC80290352016250LGN00',
//   sensor: 'OLI_TIRS',
//   acquisition_date: Tue Sep 06 2016 00:00:00 GMT-0400 (EDT),
//   browse_url: 'http://earthexplorer.usgs.gov/browse/landsat_8/2016/029/035/LC80290352016250LGN00.jpg',
//   path: 29,
//   row: 35,
//   cc_full: 9,
//   cc_quad_ul: null,
//   cc_quad_ur: null,
//   cc_quad_ll: null,
//   cc_quad_lr: null,
//   data_type_l1: 'DAY',
//   l1_key: null
