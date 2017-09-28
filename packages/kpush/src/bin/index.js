#!/usr/bin/env node
import commander from './commander.js'

commander.start()
  .catch(e => console.error(e.message))
