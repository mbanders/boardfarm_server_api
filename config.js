module.exports = {
  'port': 5001,
  'min_boardfarm_client_version': '1.1.0'
}

// For connecting to MongoDB
var user = process.env.MONGO_USER
var pass = process.env.MONGO_PASS
var srv = process.env.MONGO_SERVER
module.exports.mongodb_uri = `mongodb://${user}:${pass}@${srv}/test?retryWrites=true&w=majority`
