
// curl -X POST -H "Content-Type: application/json" -d @config.json http://localhost:5001/api/bf_config

var extend = require('util')._extend

function sorted(obj) {
  const ordered = {}
  Object.keys(obj).sort().forEach(function(key) {
    ordered[key] = obj[key];
  })
  return ordered
}

function process_config (bf_config, callback) {
  // Array of documents we will insert
  var devices_to_insert = []
  var locations_to_insert = []
  var stations_to_insert = []

  // Drop unused keys
  if ('_redirect' in bf_config) {
    delete bf_config._redirect
  }

  // Data that boardfarm client doesn't need to know, but
  // is useful for our server.
  const meta_data = {
    waitlist: [],
    visible: true,
    total_uses: 0,
    note: null,
    max_users: 1,
    previous_user: null,
    current_user: null
  }

  if ('locations' in bf_config) {
    var entries = Object.entries(bf_config.locations)
    for (const [key, val] of entries) {
      // Put shared devices into their own table
      if ('devices' in val) {
        val['devices'].forEach(e => {
          e._meta = extend({}, meta_data)
          if ('max_users' in e) {
            e._meta.max_users = e.max_users
            delete e.max_users
          }
          if (!('feature' in e)) {
            e.feature = []
          }
          e.location = key
          devices_to_insert.push(sorted(e))
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
    val._meta = extend({}, meta_data)
    if ('available_for_autotests' in val) {
      val._meta.visible = val.available_for_autotests
      delete val.available_for_autotests
    }
    if (!('feature' in val)) {
      val.feature = []
    }
    if (!('location' in val)) {
      val.location = 'local'
    }
    stations_to_insert.push(sorted(val))
  }

  callback(devices_to_insert, locations_to_insert, stations_to_insert)
}

module.exports.process_config = process_config
