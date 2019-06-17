#!/usr/bin/env nodejs

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
  collection = client.db(db_name).collection('bf_config')
  collection.insertOne(bf_config, (err, res) => {
    if (err) {
      console.log(err)
      console.log('Error inserting config into MongoDB')
      process.exit(1)
    }
    console.log('Inserted %s into MongodDB', bf_config_name)
    client.close()
  })
})
