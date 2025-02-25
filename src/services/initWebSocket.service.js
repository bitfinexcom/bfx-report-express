'use strict'

const WebSocket = require('ws')
const { PeerRPCClient } = require('grenache-nodejs-ws')
const Link = require('grenache-nodejs-link')
const config = require('config')

const { CustomLogger } = require('./log.service')
const { checkGrenacheClientConf } = require('./helpers')
const { jsonRpcResponder } = require('./helpers/responses')

checkGrenacheClientConf()

const logger = new CustomLogger({
  label: ':grenache:client:ws'
}).createLogger()

const {
  grape,
  query
} = config.get('grenacheClient')
const appConfig = config.get('app')
const wsRpcTimeout = appConfig?.wsRpcTimeout ?? 90000

const _sendData = (ws, data) => {
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }

  ws.send(JSON.stringify(data))
}

const _getReqAdapter = (body) => {
  if (
    !body ||
    typeof body !== 'object'
  ) {
    return { body: { id: null } }
  }

  const { id = null, action = '', method = '' } = body

  if (
    action &&
    typeof action === 'string'
  ) {
    return { body: { id, action } }
  }
  if (
    method &&
    typeof method === 'string'
  ) {
    return { body: { id, action: method } }
  }

  return { body: { id } }
}

const _sendJsonRpcResponse = (ws, data, body) => {
  const reqAdapter = _getReqAdapter(body)
  const resAdapter = {
    code: 200,
    status (code) {
      this.code = code
    },
    json (rpcRes) {
      rpcRes.action = reqAdapter?.body?.action ?? data?.action ?? rpcRes.action

      _sendData(ws, rpcRes)
    }
  }

  jsonRpcResponder(
    reqAdapter,
    resAdapter,
    data,
    { logger }
  )
}

const _sendError = (ws, error = 'ERR_WS', body) => {
  if (ws.readyState !== WebSocket.OPEN) {
    return
  }

  const err = error instanceof Error
    ? error
    : new Error(error)

  _sendJsonRpcResponse(ws, err, body)
}

const heartbeat = (socket) => {
  clearTimeout(socket.pingTimeout)

  socket.pingTimeout = setTimeout(() => {
    socket.terminate()
  }, 20_000 + 10_000)
}

module.exports = (server) => {
  const link = new Link({
    grape,
    requestTimeout: 5_000,
    lruMaxAgeLookup: 20_000
  })
  link.start()

  const key = `${query}:ws`

  const wss = new WebSocket.Server({ server, path: '/ws' })

  wss.on('error', (err) => {
    logger.error(err.stack || err)
  })

  wss.on('connection', (ws) => {
    ws.isAlive = true

    ws.on('pong', () => {
      ws.isAlive = true
    })

    link.lookup(
      key, {},
      (err, dests) => {
        if (err) {
          _sendError(ws, err)
          ws.close(1001)

          return
        }

        const opts = {
          timeout: 20_000,
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

        const { inactivityTimeout } = { ...transport.conf }
        const inactivityInterval = setInterval(() => {
          transport.setLastRequestTime()
        }, inactivityTimeout / 2)

        const { socket } = transport

        socket.on('open', () => {
          heartbeat(socket)
        })
        socket.on('ping', () => {
          heartbeat(socket)
        })
        socket.on('close', () => {
          clearTimeout(socket.pingTimeout)
        })
        socket.on('message', (data) => {
          const payload = transport.parse(data)

          if (
            !Array.isArray(payload) ||
            // When a request id exists payload should be processed by `peer.request`
            typeof payload[0] === 'string'
          ) {
            return
          }

          const [, err, res] = payload

          if (err) {
            _sendError(ws, err, res)

            return
          }
          if (
            !res ||
            typeof res !== 'object' ||
            !res.action ||
            typeof res.action !== 'string'
          ) {
            return
          }

          _sendJsonRpcResponse(ws, res)
        })
        ws.on('message', (data) => {
          const payload = transport.parse(data)

          peer.request(key, payload, { timeout: wsRpcTimeout }, (err, result) => {
            if (err) {
              _sendError(ws, err, payload)

              return
            }

            _sendJsonRpcResponse(ws, result, payload)
          })
        })

        socket.on('error', () => {
          _sendError(ws, 'ERR_GRENACHE_WS')
          clearInterval(inactivityInterval)
          ws.close(1001)
        })
        socket.on('close', () => {
          _sendError(ws, 'GRENACHE_WS_IS_CLOCED')
          clearInterval(inactivityInterval)
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

  const aliveStateInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) {
        ws.terminate()

        return
      }

      ws.isAlive = false
      ws.ping(null, false)
      _sendData(ws, { action: '__ping__' })
    })
  }, 10000)

  wss.on('close', () => {
    clearInterval(aliveStateInterval)
  })
}
