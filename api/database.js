const config = require('../config')

const MongoClient = require('mongodb').MongoClient
const client = new MongoClient(config.mongodb_uri, { useNewUrlParser: true })
client.connect(err => {
    if (err) {
	console.log("Error connecting to MongoDB")
	process.exit(1)
    }
    console.log("Connected to MongoDB")
    const collection = client.db("test").collection("devices")
    client.close()
})
