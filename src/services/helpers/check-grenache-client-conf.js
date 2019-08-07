'use strict'

const config = require('config')

const { CustomLogger } = require('../log.service')

const logger = new CustomLogger({
  label: ':grenache:client'
}).createLogger()

module.exports = () => {
  if (
    config.has('grenacheClient') &&
    config.has('grenacheClient.grape') &&
    config.has('grenacheClient.query')
  ) {
    return
  }

  const err = new Error('ERR_CONFIG_ARGS_NO_GRENACHE_CLIENT')

  logger.error('Found %s at %s', 'error', err)

  throw err
}
