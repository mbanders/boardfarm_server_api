const config = require('../config')

const mongodb = require('mongodb')
// const MongoClient = require('mongodb').MongoClient
const client = new mongodb.MongoClient(config.mongodb_uri, { useNewUrlParser: true })
const db_name = 'boardfarm'

module.exports = {
  'devices': null,
  'bf_config': null
}

module.exports.sanitize = function (data) {
  if ('_id' in data) {
    data['_id'] = new mongodb.ObjectID(data['_id'])
  }
  return data
}

client.connect(err => {
  if (err) {
    console.log(err)
    console.log('Error connecting to MongoDB')
    process.exit(1)
  }
  console.log('Connected to MongoDB')
  module.exports.devices = client.db(db_name).collection('devices')
  module.exports.bf_config = client.db(db_name).collection('bf_config')
})

process.on('SIGINT', () => {
  console.log('Disconnect from mongodb')
  client.close()
  process.exit()
})
