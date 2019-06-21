'use strict'

const { omit } = require('lodash')
const WebSocket = require('ws')
const { PeerRPCClient } = require('grenache-nodejs-ws')
const Link = require('grenache-nodejs-link')
const config = require('config')

const { CustomLogger } = require('./log.service')
const prepareErrorDataService = require('./prepareErrorData.service')
const { checkGrenacheClientConf } = require('./helpers')

checkGrenacheClientConf()

const logger = new CustomLogger({
  label: ':grenache:client:ws'
}).createLogger()

const {
  grape,
  query
} = config.get('grenacheClient')

const _sendData = (ws, data) => {
  ws.send(JSON.stringify(data))
}

const _sendError = (ws, err) => {
  const {
    code,
    message
  } = prepareErrorDataService(err, logger)

  _sendData(ws, {
    error: {
      code,
      message
    }
  })
}

module.exports = (server) => {
  const link = new Link({
    grape,
    requestTimeout: 2500,
    lruMaxAgeLookup: 10000
  })
  link.start()

  const key = `${query}:ws`

  const wss = new WebSocket.Server({ server, path: '/ws' })

  wss.on('error', (err) => {
    logger.error(err.stack || err)
  })

  wss.on('connection', (ws) => {
    link.lookup(
      key, {},
      (err, dests) => {
        if (err) {
          _sendError(ws, err)
          ws.close(1001)

          return
        }

        const opts = {
          timeout: 10000,
          maxActiveKeyDests: 1,
          maxActiveDestTransports: 1
        }
        const peer = new PeerRPCClient(link, opts)
        peer.init()

        const dest = peer.dest(dests, key, peer.getDestOpts(opts))
        const transport = peer.transport(
          dest,
          peer.getTransportOpts(opts)
        )

        transport.connect()

        const { socket } = transport

        socket.on('message', (data) => {
          const payload = transport.parse(data)

          if (!Array.isArray(payload)) {
            return
          }

          const [sid, err, res] = payload

          if (err) {
            _sendError(ws, err)

            return
          }
          if (
            !sid ||
            typeof sid !== 'string' ||
            !res ||
            typeof res !== 'object' ||
            !res.action ||
            typeof res.action !== 'string'
          ) {
            return
          }

          _sendData(ws, res)
        })
        ws.on('message', (data) => {
          const payload = transport.parse(data)

          if (!payload) {
            return
          }

          const body = { ...payload }
          const { id = null, method = '' } = body
          const args = omit(body, ['id'])

          peer.request(key, args, { timeout: 10000 }, (err, result) => {
            if (err) {
              _sendError(ws, err)

              return
            }

            _sendData(ws, {
              action: method,
              result,
              id
            })
          })
        })

        socket.on('error', () => {
          _sendError(ws, new Error('ERR_GRENACHE_WS'))
          ws.close(1001)
        })
        socket.on('close', () => {
          _sendError(ws, new Error('GRENACHE_WS_IS_CLOCED'))
          ws.close(1001)
        })

        ws.on('error', () => {
          logger.debug('ERR_WS')
          socket.terminate()
        })
        ws.on('close', () => {
          logger.debug('ERR_WS_IS_CLOSED')
          socket.close(1000)
        })
      }
    )
  })
}
