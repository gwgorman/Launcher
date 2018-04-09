'use strict'

const fs = require('fs')
const Promise = require('bluebird')

const { Caddy } = require('./caddy')
const { Mongo } = require('./mongo')
const { loadModules } = require('./module-loader')
const { loadLogsOptions, createLogStream } = require('./logs')

Promise.promisifyAll(fs)

const STARTING_PORT = 1300

exports.Server = class {
  constructor (modulesFile) {
    this.modulesPromise = loadModules()
    this.mainLogStream = createLogStream('main')
    this.caddy = new Caddy(createLogStream('caddy'))
    this.mongo = new Mongo(createLogStream('mongo'))
  }

  start () {
    return Promise.resolve()
      .then(() => this.mongo.start())
      .then(() => loadLogsOptions())
      .then(logsOptions => this.modulesPromise
        .map((module, i) => module.start(Object.assign({
          port: STARTING_PORT + i,
          logStream: this.mainLogStream
        }, logsOptions), {
          caddy: this.caddy,
          mongo: this.mongo
        }))
      )
      .then(stopFunctions => { this.modulesStopFunctionsPromise = Promise.resolve(stopFunctions) })
      .then(() => this.caddy.start())
  }

  close () {
    return this.modulesStopFunctionsPromise
      .each(stop => {
        stop()
      })
  }

  getModules () {
    return this.modulesPromise
  }

  resetData () {
    this.getModules()
      .then(modules =>
        Promise.all(modules.map(module => module.reset()))
      )
      .catch(() => {
        console.error('Failed to reset modules data')
      })
  }
}
