
// curl -X POST -H "Content-Type: application/json" -d @config.json http://localhost:5001/api/bf_config

function process_config (bf_config, callback) {
  // Array of documents we will insert
  var devices_to_insert = []
  var locations_to_insert = []
  var stations_to_insert = []

  if ('locations' in bf_config) {
    var entries = Object.entries(bf_config.locations)
    for (const [key, val] of entries) {
      // Put shared devices into their own table
      if ('devices' in val) {
        val['devices'].forEach(e => {
          if (!('max_users' in e)) {
            e.max_users = 1
          }
          e.active_users = 0
          e.available_for_autotests = true
          e.location = key
          devices_to_insert.push(e)
        })
        delete val.devices
      }
      val.name = key
      locations_to_insert.push(val)
    }
    delete bf_config.locations
  }

  entries = Object.entries(bf_config)
  for (const [key, val] of entries) {
    val.name = key
    val.available_for_autotests = true
    val.active_users = 0
    val.active_user = ''
    val.active_host = ''
    val.prev_user = ''
    val.prev_host = ''
    val.total_uses = 0
    stations_to_insert.push(val)
  }

  callback(devices_to_insert, locations_to_insert, stations_to_insert)
}

module.exports.process_config = process_config
