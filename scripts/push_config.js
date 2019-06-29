#!/usr/bin/env node

const config = require('../config')

const mongodb = require('mongodb')
// const MongoClient = require('mongodb').MongoClient
const client = new mongodb.MongoClient(config.mongodb_uri, { useNewUrlParser: true })
const db_name = 'boardfarm'

if (process.argv.length != 3) {
  console.log('You must specify a .json file to upload into mongodb')
  process.exit(1)
}
var bf_config_name = process.argv[2]
if (!bf_config_name.startsWith('.')) {
  bf_config_name = './' + bf_config_name
}
console.log('Loading %s', bf_config_name)
const bf_config = require(bf_config_name)

client.connect(err => {
  if (err) {
    console.log(err)
    console.log('Error connecting to MongoDB')
    process.exit(1)
  }
  console.log('Connected to MongoDB')

  // Collections to insert to
  station_coll = client.db(db_name).collection('station')
  location_coll = client.db(db_name).collection('location')
  device_coll = client.db(db_name).collection('device')

  // Array of documents we will insert
  stations_to_insert = []
  locations_to_insert = []
  devices_to_insert = []

  console.log(Object.keys(bf_config))
  if ("locations" in bf_config) {
    var entries = Object.entries(bf_config.locations)
    for (const [key, val] of entries) {
      // Put shared devices into their own table
      if ("devices" in val) {
        val["devices"].forEach(e => {
          e.max_users = 1
          e.location = key
          devices_to_insert.push(e)
        })
      }
      val.name = key
      locations_to_insert.push(val)
    }
    delete bf_config.locations

    device_coll.insertMany(devices_to_insert, (err, res) => {
      if (err) {
        throw err
      }
      console.log("Inserted %s devices.", devices_to_insert.length)
      process.exit(0)
    })

    location_coll.insertMany(locations_to_insert, (err, res) => {
      if (err) {
	throw err
      }
      console.log("Inserted %s locations.", locations_to_insert.length)
    })
  }

  var entries = Object.entries(bf_config)
  for (const [key, val] of entries) {
    val.name = key
    val.active_users = 0
    val.active_user = ""
    val.active_host = ""
    val.prev_user = ""
    val.prev_host = ""
    val.total_uses = 0
    stations_to_insert.push(val)
  }
  station_coll.insertMany(stations_to_insert, (err, res) => {
    if (err) {
      throw err
    }
    console.log("Inserted %s stations.", stations_to_insert.length)
  })

  console.log("Closing connection ...")
  client.close()
  /*collection.insertOne(bf_config, (err, res) => {
    if (err) {
      console.log(err)
      console.log('Error inserting config into MongoDB')
      process.exit(1)
    }
    console.log('Inserted %s into MongodDB', bf_config_name)
    client.close()
  })*/
})
