#!/usr/bin/env node
const path = require('path')
require('app-module-path').addPath(path.resolve(__dirname, '../'))

const commander = require('./commander.js').default

commander.start()
  .catch(e => console.error(e.message))
