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

router.get('/locations', (req, res) => {
  database.location.find({}).toArray((err, docs) => {
    res.json(docs)
  })
})

router.get('/stations', (req, res) => {
  database.station.find({}).toArray((err, docs) => {
    res.json(docs)
  })
})

router.get('/bf_config', (req, res) => {
  database.bf_config.findOne({}, (err, doc) => {
    delete doc._id
    res.json(doc)
  })
})

router.get('/bf_config_new', (req, res) => {
  // Only return stations matching this filter
  const station_filter = {"active_users": 0, "available_for_autotests": true}
  // Final config that will be returned
  var final_config = {}
  // Add locations
  database.location.find({}).toArray( (err, docs) => {
    if (err) {
      throw err
    }

    final_config.locations = {}
    docs.forEach( (doc) => {
      let name = doc.name
      delete doc._id
      delete doc.name
      final_config.locations[name] = doc
    })
    
    // Add stations
    database.station.find(station_filter).toArray( (err, docs) => {
      if (err) {
	throw err
      }

      docs.forEach( (doc) => {
	let name = doc.name
	delete doc._id
	delete doc.name
	final_config[name] = doc
      })
      // Send result
      res.json(final_config)
    })
  })
})

router.post('/checkout', (req, res) => {
  console.log('Request from %s to checkout: %s', req.connection.remoteAddress, req.body.name)
  req.body.timestamp = new Date().toISOString()
  console.log(req.body)
  var filter = {"name": req.body.name}
  database.station.findOneAndUpdate(filter, { $inc: {"active_users" : 1 } }, {}, (err, doc) => {
    if (err) {
      res.json({ 'status': 'fail' })
    } else {
      res.json(doc)
    }
  })
})

router.post('/checkin', (req, res) => {
  console.log('Request from %s to checkin: %s', req.connection.remoteAddress, req.body.name)
  req.body.timestamp = new Date().toISOString()
  console.log(req.body)
  var filter = {"name": req.body.name}
  database.station.findOneAndUpdate(filter, { $inc: {"active_users" : -1 } }, {}, (err, doc) => {
    if (err) {
      res.json({ 'status': 'fail' })
    } else {
      res.json(doc)
    }
  })
})

module.exports = router
