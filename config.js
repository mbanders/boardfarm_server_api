module.exports = {
  'port': 5001
}

// For connecting to MongoDB
var user = process.env.MONGO_USER
var pass = process.env.MONGO_PASS
var srv = process.env.MONGO_SERVER
module.exports.mongodb_uri = `mongodb+srv://${user}:${pass}@${srv}/test?retryWrites=true&w=majority`
