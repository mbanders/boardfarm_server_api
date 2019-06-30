const config = require('../config')

const mongodb = require('mongodb')
// const MongoClient = require('mongodb').MongoClient
const client = new mongodb.MongoClient(config.mongodb_uri, { useNewUrlParser: true })
const db_name = 'boardfarm'

module.exports = {
  'device': null,
  'bf_config': null,
  'station': null,
  'location': null
}

client.connect(err => {
  if (err) {
    console.log(err)
    console.log('Error connecting to MongoDB')
    process.exit(1)
  }
  console.log('Connected to MongoDB')
  module.exports.device = client.db(db_name).collection('device')
  module.exports.bf_config = client.db(db_name).collection('bf_config')
  module.exports.station = client.db(db_name).collection('station')
  module.exports.location = client.db(db_name).collection('location')
})

process.on('SIGINT', () => {
  console.log('Disconnect from mongodb')
  client.close()
  process.exit()
})
