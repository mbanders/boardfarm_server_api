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


// For devices with a waitlist, but no current user,
// set the current user to the first person in waitlist.
// Run periodically.
function move_from_waitlist_to_current() {
  console.log("Checking if we can move waitlist people to current users...")
  var item_filter = { '_meta.current_user': null,
                      $expr: { $gt: [ {$size: "$_meta.waitlist"}, 0] }
                    }
  database.device.find(item_filter).forEach( e => {
    database.device.updateOne({_id: e._id}, {
      $set: {'_meta.current_user': e._meta.waitlist[0]},
      $pop: {'_meta.waitlist': -1} 
    })
  })
}
setInterval(move_from_waitlist_to_current, 30000)


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
  console.log('Received a new boardfarm config file from %s', req.connection.remoteAddress)
  bfconfigprocessor.process_config(req.body, (devices, locations, stations) => {
    database.device.drop()
    database.location.drop()
    database.station.drop()
    console.log('Will insert into mongodb:')
    console.log(' * %s devices', devices.length)
    console.log(' * %s locations', locations.length)
    console.log(' * %s stations', stations.length)
    if (devices.length > 0) {
      database.device.insertMany(devices, (err, result) => {
        if (err) {
          throw err
        }
        console.log('Inserted %s devices.', devices.length)
      })
    }
    if (locations.length > 0) {
      database.location.insertMany(locations, (err, result) => {
        if (err) {
          throw err
        }
        console.log('Inserted %s locations.', locations.length)
      })
    }
    database.station.insertMany(stations, (err, result) => {
      if (err) {
        throw err
      }
      console.log('Inserted %s stations.', stations.length)
      var msg = `Successfully inserted ${devices.length} shared devices, ${locations.length} locations, ${stations.length} stations.`
      res.json({ 'message': msg })
    })
  })
})

router.get('/bf_config', (req, res) => {
  // Only return stations matching this filter
  const station_filter = { '_meta.visible': true }
  const device_filter = { '_meta.visible': true }
  // Fields to hide when returning boardfarm config
  const projection = { 'projection': { '_meta': 0} }
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
        if (err) {
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

router.post('/add_to_waitlists', (req, res) => {
  console.log('Request from %s for items:', req.connection.remoteAddress)
  req.body.timestamp = new Date()
  console.log(req.body)

  var ids = req.body.item_ids
  var _ids = database.str_to_id(req.body.item_ids)
  var item_filter = { _id: { $in: _ids } }

  var user_info = {
    host: req.body.host,
    id: req.body.user_id,
    last_contact: req.body.timestamp,
    user: req.body.user
  }

  var action = { $push: { '_meta.waitlist': user_info } }

  database.device.updateMany(item_filter, action, {}, (err, res) => {
    if (err) {
      throw err
    } else {
      console.log('Added to waitlist for %s items.', res.result.nModified)
    }
  })

  res.json({})
})

router.post('/ask_if_ready', (req, res) => {
  console.log('Request from %s to see if all items are ready.', req.connection.remoteAddress)
  req.body.timestamp = new Date()

  res.json({})
})

router.post('/give_back', (req, res) => {
  console.log('Request from %s to give back items:', req.connection.remoteAddress)
  req.body.timestamp = new Date()
  console.log(req.body)

  var ids = req.body.item_ids
  var _ids = database.str_to_id(req.body.item_ids)
  var item_filter = { }

  var action = { $pull: { '_meta.waitlist': {id: req.body.user_id} } }

  // Remove from all waitlists
  database.device.updateMany(item_filter, action, {}, (err, res) => {
    if (err) {
      throw err
    } else {
      console.log('Removed from %s waitlists.', res.result.nModified)
    }
  })
  // Remove from all current users

  res.json({})
})

router.post('/checkout', (req, res) => {
  console.log('Request from %s to checkout: %s', req.connection.remoteAddress, req.body.name)
  req.body.timestamp = new Date().toISOString()
  console.log(req.body)
  var filter = { 'name': req.body.name }
  var action = { $inc: { 'active_users': 1,
    'total_uses': 1 },
  $set: { 'active_user': req.body.username,
    'active_host': req.body.hostname,
    'active_url': req.body.build_url}
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
  req.body.timestamp = new Date().toISOString()
  console.log(req.body)
  var filter = { 'name': req.body.name }
  var action = { $inc: { 'active_users': -1 },
    $set: { 'active_user': '',
      'active_host': '',
      'active_url': '',
      'prev_user': req.body.username,
      'prev_host': req.body.hostname,
      'prev_url': req.body.build_url}
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
