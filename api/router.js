const express = require('express')
var router = express.Router()

const database = require('./database')
const bfconfigprocessor = require('./bfconfigprocessor')
const api_version = require('../package.json').version

router.get('/', (req, res) => {
  res.json({ message: 'Welcome to Boardfarm REST API',
             version: api_version })
})

router.get('/devices', (req, res) => {
  database.device.find({}).toArray((err, docs) => {
    res.json(docs)
  })
})

router.get('/locations', (req, res) => {
  database.location.find({}).toArray((err, docs) => {
    res.json(docs)
  })
})

router.get('/locations/:name', (req, res) => {
  database.location.findOne({ 'name': req.params.name }, (err, docs) => {
    res.json(docs)
  })
})

router.get('/stations', (req, res) => {
  database.station.find({}).toArray((err, docs) => {
    res.json(docs)
  })
})

router.get('/stations/:name', (req, res) => {
  database.station.findOne({ 'name': req.params.name }, (err, docs) => {
    res.json(docs)
  })
})

router.post('/stations/:name', (req, res) => {
  var filter = { 'name': req.params.name }
  var action = { $set: req.body }
  database.station.findOneAndUpdate(filter, action, {}, (err, doc) => {
    if (err) {
      res.json({ 'status': 'fail' })
    } else {
      res.json(doc)
    }
  })
})

router.post('/bf_config', (req, res) => {
  console.log("Received a new boardfarm config file from %s", req.connection.remoteAddress)
  bfconfigprocessor.process_config(req.body, (devices, locations, stations) => {
    database.device.drop()
    database.location.drop()
    database.station.drop()
    console.log('Will insert into mongodb:')
    console.log(' * %s devices', devices.length)
    console.log(' * %s locations', locations.length)
    console.log(' * %s stations', stations.length)
    database.device.insertMany(devices, (err, result) => {
      if (err) {
        throw err
      }
      console.log('Inserted %s devices.', devices.length)
    })
    database.location.insertMany(locations, (err, result) => {
      if (err) {
        throw err
      }
      console.log('Inserted %s locations.', locations.length)
    })
    database.station.insertMany(stations, (err, result) => {
      if (err) {
        throw err
      }
      console.log('Inserted %s stations.', stations.length)
      var msg = `Successfully inserted ${devices.length} shared devices, ${locations.length} locations, ${stations.length} stations.`
      res.json({'message': msg})
    })
  })
})

router.get('/bf_config', (req, res) => {
  // Only return stations matching this filter
  const station_filter = { 'active_users': { $in: [null, 0] },
                           'available_for_autotests': true }
  const device_filter = { $expr: { $gt: ["$max_users", "$active_users"] } }
  const projection = {'projection': {_id: 0, max_users: 0, active_users: 0, available_for_autotests: 0}}
  // Final config that will be returned
  var final_config = {}
  // Add locations
  database.location.find({}, projection).toArray((err, docs) => {
    if (err) {
      throw err
    }

    final_config.locations = {}
    docs.forEach((doc) => {
      doc.devices = []
      let name = doc.name
      delete doc.name
      final_config.locations[name] = doc
    })

    // Add devices to their locations
    database.device.find(device_filter, projection).toArray((err, docs) => {
      let names = []
      for (let i = 0; i < docs.length; i++) {
        let doc = docs[i]
        // Only show at most 1 device of a given name
        if (names.includes(doc.name)) {
          continue
        }
        names.push(doc.name)
        final_config.locations[doc.location].devices.push(doc)
      }
    })

    // Add stations
    database.station.find(station_filter, projection).toArray((err, docs) => {
      if (err) {
        throw err
      }

      docs.forEach((doc) => {
        let name = doc.name
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
  var filter = { 'name': req.body.name }
  var action = { $inc: { 'active_users': 1,
                         'total_uses': 1 },
		             $set: { 'active_user': req.body.username,
                         'active_host': req.body.hostname }
	             }
  database.station.findOneAndUpdate(filter, action, {}, (err, doc) => {
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
  var filter = { 'name': req.body.name }
  var action = { $inc: { 'active_users': -1 },
                 $set: { 'active_user': '',
                         'active_host': '',
                         'prev_user': req.body.username,
                         'prev_host': req.body.hostname }
	             }
  database.station.findOneAndUpdate(filter, action, {}, (err, doc) => {
    if (err) {
      res.json({ 'status': 'fail' })
    } else {
      res.json(doc)
    }
  })
})

module.exports = router
