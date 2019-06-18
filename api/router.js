const express = require('express')
var router = express.Router()

const database = require('./database')
const api_version = require('../package.json').version

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to Boardfarm REST API',
	     version: api_version })
})

router.get('/devices', (req, res) => {
  database.devices.find({}).toArray((err, docs) => {
    res.json(docs)
  })
})

router.get('/bf_config', (req, res) => {
  database.bf_config.findOne({}, (err, doc) => {
    delete doc._id
    res.json(doc)
  })
})

router.post('/checkout', (req, res) => {
  console.log('Request from %s to checkout: %s', req.connection.remoteAddress, req.body.name)
  req.body.timestamp = new Date().toISOString()
  console.log(req.body)
  res.json({"message": "OK"})
  /*req.body['inUse'] = false
  console.log(req.body)
  database.devices.findOneAndUpdate(req.body, { $set: { inUse: true } }, {}, (err, doc) => {
    if (err) {
      res.json({ 'status': 'fail' })
    } else {
      res.json(doc)
    }
  })*/
})

router.post('/checkin', (req, res) => {
  console.log('Request from %s to checkin: %s', req.connection.remoteAddress, req.body.name)
  req.body.timestamp = new Date().toISOString()
  console.log(req.body)
  res.json({"message": "OK"})
  /*req.body = database.sanitize(req.body)
  console.log(req.body)
  database.devices.findOneAndUpdate(req.body, { $set: { inUse: false } }, {}, (err, doc) => {
    if (err) {
      res.json({ 'status': 'fail' })
    } else {
      res.json(doc)
    }
  })*/
})

module.exports = router
