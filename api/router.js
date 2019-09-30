const express = require('express')
var router = express.Router()

const database = require('./database')
const bfconfigprocessor = require('./bfconfigprocessor')
const api_version = require('../package.json').version

// Use this cache function for any page that doesn't
// need to query mongo every *single* time.
const mcache = require('memory-cache');
var cache = (duration) => {
  return (req, res, next) => {
    let key = '__express__' + req.originalUrl || req.url
    let cachedBody = mcache.get(key)
    if (cachedBody) {
      res.send(cachedBody)
      return
    } else {
      res.sendResponse = res.send
      res.send = (body) => {
        mcache.put(key, body, duration * 1000);
        res.sendResponse(body)
      }
      next()
    }
  }
}

// Use this Fisher-Yates shuffle function to reduce the chance
// of different users trying to connect to the same device
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Check-in things automatically when we haven't
// heard from the user in a while.
function auto_checkin() {
  var now = new Date()
  var two_minutes_ago = new Date(now.getTime() - 2*60000)
  var item_filter = { 'active_time': { $lt: two_minutes_ago } }
  // Checkin unused stations
  database.station.find(item_filter).forEach( e => {
    console.log("Removing " + e.active_user +  " from " + e._id)
    database.station.updateOne({_id: e._id}, {
      $inc: { 'total_uses': 1 },
      $set: {
        'prev_user': e.active_user,
        'prev_host': e.prev_host,
        'prev_url': e.prev_url,
        'prev_time': e.active_time,
        'active_users': 0,
        'active_user': '',
        'active_host': '',
        'active_url': '',
        'active_time': null
      }
    })
  })
  // Checkin unused devices
  database.device.find(item_filter).forEach( e => {
    console.log("Removing " + e.active_user +  " from " + e._id)
    database.device.updateOne({_id: e._id}, {
      $inc: { 'total_uses': 1 },
      $set: {
        'prev_user': e.active_user,
        'prev_host': e.prev_host,
        'prev_url': e.prev_url,
        'prev_time': e.active_time,
        'active_users': 0,
        'active_user': '',
        'active_host': '',
        'active_url': '',
        'active_time': null
      }
    })
  })
}
// Check every minute
// IMPORTANT: Un-comment the next line after boardfarm client has the polling enabled.
setInterval(auto_checkin, 60000)

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

// Front-end polls this to display. We don't need to update
// rapidly, so caching this improves response time by
// an order of magnitude.
router.get('/stations', cache(1.5), (req, res) => {
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
  console.log('POST /bf_config from %s', req.connection.remoteAddress)
  bfconfigprocessor.process_config(req.body, (devices, locations, stations) => {
    // Remove existing collections
    database.device.drop((err, result) => {
      database.location.drop((err, result) => {
        database.station.drop((err, result) => {
          console.log('Dropped existing data.')
          console.log('Next, insert into mongodb:')
          console.log(' * %s devices', devices.length)
          console.log(' * %s locations', locations.length)
          console.log(' * %s stations', stations.length)
          database.device.insertMany(devices, (err, result) => {
            if (err) {
              throw err
            }
            database.location.insertMany(locations, (err, result) => {
              if (err) {
                throw err
              }
              database.station.insertMany(stations, (err, result) => {
                if (err) {
                  throw err
                }
                let msg = `Successfully inserted ${devices.length} shared devices, ${locations.length} locations, ${stations.length} stations.`
                console.log(msg)
                res.json({ 'message': msg })
              })
            })
          })
        })
      })
    })
  })
})

router.get('/bf_config', (req, res) => {
  console.log("GET /bf_config")
  // Only return stations matching this filter
  const station_filter = { 'active_user': { $in: [null, ''] } }
  const device_filter = { $expr: { $gt: ['$max_users', '$active_users'] } }
  // Fields to hide when returning boardfarm config
  const projection = { 'projection': {
      active_users: 0,
      active_host: 0,
      active_time: 0,
      active_url: 0,
      active_user: 0,
      max_users: 0,
      prev_host: 0,
      prev_time: 0,
      prev_user: 0,
      prev_url: 0,
      total_uses: 0
    }
  }
  // Final config that will be returned
  var final_config = {}
  // Add locations
  database.location.find({}, projection).toArray((err, docs) => {
    if (docs.length == 0) {
      console.log(`WARNING: ${docs.length} locations returned by mongodb.`)
    }

    if (err) {
      console.log(err)
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
      if (docs.length == 0) {
        console.log(`WARNING: ${docs.length} devices returned by mongodb.`)
      }
      if (err) {
        console.log(err)
        throw err
      }

      let names = {}
      shuffle(docs)
      for (let i = 0; i < docs.length; i++) {
        let doc = docs[i]
        // Only show at most 1 device of a given name (per location)
        if (!(doc.location in names)) {
          names[doc.location] = []
        }
        if (names[doc.location].includes(doc.name)) {
          continue
        }
        names[doc.location].push(doc.name)
        final_config.locations[doc.location].devices.push(doc)
      }

      // Add stations
      database.station.find(station_filter, projection).toArray((err, docs) => {
        if (docs.length == 0) {
          console.log(`WARNING: ${docs.length} stations returned by mongodb.`)
        }

        if (err) {
          console.log(err)
          throw err
        }

        docs.forEach((doc) => {
          let name = doc.name
          delete doc.name
          final_config[name] = doc
        })
        if (Object.keys(final_config.locations).length == 0) {
          delete final_config.locations
        }
        // Send result
        res.json(final_config)
      }) // end add stations
    }) // end add devices
  }) // end add locations
})

router.post('/checkout', (req, res) => {
  console.log('Request from %s to checkout: %s', req.connection.remoteAddress, req.body.name)
  req.body.timestamp = new Date()
  console.log(req.body)
  var filter = { 'name': req.body.name }
  var action = { $set: { 'active_users': 1,
                         'active_user': req.body.username,
                         'active_host': req.body.hostname,
                         'active_url': req.body.build_url,
                         'active_time': req.body.timestamp
                        }
                }
  var device_ids = req.body.ids
  if (device_ids.length > 1) {
    // Checkout shared devices
    let dev_filter = { _id: { $in: database.str_to_id(device_ids) } }
    database.device.updateMany(dev_filter, action, {}, (err, res) => {
      if (err) {
        throw err
      } else {
        console.log('Checked out %s devices.', res.result.nModified)
      }
    })
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
  req.body.timestamp = new Date()
  console.log(req.body)
  var filter = { 'name': req.body.name }
  var action = { $inc: { 'total_uses': 1 },
                 $set: { 'active_users': 0,
                         'active_user': '',
                         'active_host': '',
                         'active_url': '',
                         'active_time': null,
                         'prev_user': req.body.username,
                         'prev_host': req.body.hostname,
                         'prev_url': req.body.build_url,
                         'prev_time': req.body.timestamp
                        }
                 }
  var device_ids = req.body.ids
  if (device_ids.length > 1) {
    // Checkout shared devices
    let dev_filter = { _id: { $in: database.str_to_id(device_ids) } }
    database.device.updateMany(dev_filter, action, {}, (err, res) => {
      if (err) {
        throw err
      } else {
        console.log('Checked in %s devices.', res.result.nModified)
      }
    })
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
