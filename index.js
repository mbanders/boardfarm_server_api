#!/usr/bin/env node
const config = require('./config')

const compareVersions = require('compare-versions')
const express = require('express')
const app = express()
const bodyParser = require('body-parser')

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

// Allow cross-site origin requests.
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

// Require all POST requests have a certain content-type
app.post('*', (req, res, next) => {
  if (!req.is('application/json')) {
    res.json({ 'message': "ERROR: You must POST with 'Content-Type: application/json'" })
    return
  }
  next();
})

// Check user-agent
app.use(function (req, res, next) {
  var user = req.get('user-agent')
  console.log(user)
  // The following few lines will halt really old versions of boardfarm.
  // The message they'll actually see is
  //     HTTP Error 400: Bad Request
  //     Unable to access/read Board Farm configuration
  /*if (user && user.startsWith('Python-urllib')) {
    res.status(400)
    res.json({'message': 'Your version of boardfarm is outdated and should not be used against this server. Please update.'})
    return
  }*/
  if (user && user.startsWith('Boardfarm')) {
    bf_ver = user.split(';')[0].split(' ')[1]
    if (compareVersions(bf_ver, config.min_boardfarm_client_version) < 0) {
      res.status(400)
      res.json({'message': 'Your version of boardfarm is outdated and should not be used against this server. Please update.'})
      return
    }
  }
  next()
})

var router = require('./api/router')

// Start all router paths with /api
app.use('/api', router)

// Start Server
app.listen(config.port)
console.log('Server is listening on port ' + config.port)
