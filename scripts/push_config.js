#!/usr/bin/env node

const mongodb = require('mongodb')
const config = require('../config')

function process_config (bf_config_name, callback) {
  console.log('Reading %s ...', bf_config_name)
  const bf_config = require(bf_config_name)

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

function insert_into_mongo (devices_to_insert, locations_to_insert, stations_to_insert) {
  console.log('Will insert into mongodb:')
  console.log(' * %s devices', devices_to_insert.length)
  console.log(' * %s locations', locations_to_insert.length)
  console.log(' * %s stations', stations_to_insert.length)

  // const MongoClient = require('mongodb').MongoClient
  const client = new mongodb.MongoClient(config.mongodb_uri, { useNewUrlParser: true })
  const db_name = 'boardfarm'

  client.connect(err => {
    if (err) {
      console.log(err)
      console.log('Error connecting to MongoDB')
      process.exit(1)
    }
    console.log('Connected to MongoDB')

    // Collections to insert to
    var station_coll = client.db(db_name).collection('station')
    var location_coll = client.db(db_name).collection('location')
    var device_coll = client.db(db_name).collection('device')

    device_coll.insertMany(devices_to_insert, (err, res) => {
      if (err) {
        throw err
      }
      console.log('Inserted %s devices.', devices_to_insert.length)
    })
    location_coll.insertMany(locations_to_insert, (err, res) => {
      if (err) {
        throw err
      }
      console.log('Inserted %s locations.', locations_to_insert.length)
    })
    station_coll.insertMany(stations_to_insert, (err, res) => {
      if (err) {
        throw err
      }
      console.log('Inserted %s stations.', stations_to_insert.length)
      console.log('Closing connection ...')
      setTimeout(() => { client.close() }, 1000)
    })
  })
}

if (require.main === module) {
  if (process.argv.length !== 3) {
    console.log('You must specify a .json file to upload into mongodb')
    process.exit(1)
  }
  var bf_config_name = process.argv[2]
  if (!bf_config_name.startsWith('.')) {
    bf_config_name = './' + bf_config_name
  }
  process_config(bf_config_name, insert_into_mongo)
}
