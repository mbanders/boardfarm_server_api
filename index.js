
const config = require('./config')

const express = require('express')
const app = express()
const bodyParser = require('body-parser')

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

var router = express.Router()

router.get('/', function (req, res) {
  res.json({ message: 'Hello' })
})

app.use('/api', router)

// Start Server
app.listen(config.port)
console.log('Server is listening on port ' + config.port)
