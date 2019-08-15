#!/usr/bin/env node
const config = require('./config')

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

var router = require('./api/router')

// Start all router paths with /api
app.use('/api', router)

// Start Server
app.listen(config.port)
console.log('Server is listening on port ' + config.port)
