'use strict'

if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production'

const express = require('express')
const app = express()
const config = require('config')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const fs = require('fs')

module.exports = { app }

const {
  headersMiddleware,
  errorsMiddleware,
  notFoundMiddleware
} = require('./src/middlewares')
const {
  corsService,
  logDebugService,
  logService
} = require('./src/services')
const { logger } = logService
const routes = require('./src/routes')

const port = config.get('app.port')
const host = config.get('app.host')
const unixSocket = (
  process.env.UNIX_SOCKET ||
  (
    config.has('app.unixSocket') &&
    config.get('app.unixSocket')
  )
)

app.use(corsService.corsBase())
app.use(headersMiddleware)
app.use(bodyParser.json())

if (
  config.has('enableLogDebug') &&
  config.get('enableLogDebug')
) {
  app.use(
    morgan('combined', {
      stream: { write: msg => logDebugService.debug(msg) }
    })
  )
}

app.use('/api/', routes)

app.use(notFoundMiddleware)
app.use(errorsMiddleware)

const args = unixSocket && typeof unixSocket === 'string'
  ? [unixSocket.trim()]
  : [port, host]

if (args.length === 1) {
  try {
    fs.accessSync(unixSocket, fs.constants.R_OK | fs.constants.W_OK)
    fs.unlinkSync(unixSocket)
  } catch (err) {}
}

const server = app.listen(...args, () => {
  if (args.length === 1) {
    const address = server.address()

    fs.chmodSync(address, '777')
    logger.info(`Server listening on unix socket ${address}`)
  } else {
    const host = server.address().address
    const port = server.address().port

    logger.info(`Server listening on host ${host} port ${port}`)
  }

  app.emit('listened', server)
})
