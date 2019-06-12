'use strict'

const WebSocket = require('ws')

// TODO:
module.exports = (server) => {
  const wss = new WebSocket.Server({ server, path: '/progress' })

  wss.on('error', (ws) => {
    console.log('[ws error]'.bgRed)
  })
  wss.on('close', (ws) => {
    console.log('[ws close]'.bgBlue)
  })
  wss.on('connection', (ws, req) => {
    console.log('[ws connection]'.bgGreen)

    let i = 0

    setInterval(() => {
      ws.send(JSON.stringify({ mess: '[TEST_MESS]', count: ++i }))
    }, 1000)
  })
}
