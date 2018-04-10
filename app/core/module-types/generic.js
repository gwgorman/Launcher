'use strict'

const Promise = require('bluebird')

exports.GenericModule = class {
  constructor (modulePath, description) {
    this.name = description.name
    this.path = modulePath

    if (typeof description.command === 'string') {
      this.command = description.command
    } else {
      this.command = description.command[process.platform]
    }

    this.arguments = description.arguments || []

    Object.freeze(this)
  }

  start (options, { mongo, serviceManager }) {
    return Promise.resolve()
      .then(() => {
        if (this.requirements.includes('mongo')) {
          return mongo.createDatabase(this.name)
            .then(uri => {
              return { 'MONGO_URI': uri }
            })
        } else {
          return {}
        }
      })
      .then(additionalEnv => {
        return serviceManager.startService({
          logStream: options.logStream,
          executable: this.command,
          arguments: this.arguments,
          env: Object.assign({
            'PORT': options.port,
            'DATA_DIR': options.datadir,
            'AUTH_SECRET': options.secret,
            'LOG_LEVEL': options.logLevel
          }, additionalEnv)
        })
      })
      .then(serviceId => {
        return () => serviceManager.stopService(serviceId)
      })
  }
}
