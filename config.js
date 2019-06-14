module.exports = {
  'port': 80
}

// For connecting to MongoDB
var user = process.env.MONGO_USER
var pass = process.env.MONGO_PASS
module.exports.mongodb_uri = `mongodb+srv://${user}:${pass}@boardfarm0-mgbyp.mongodb.net/test?retryWrites=true&w=majority`
