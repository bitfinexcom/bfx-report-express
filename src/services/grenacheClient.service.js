'use strict'

const Grenache = require('grenache-nodejs-http')
const Link = require('grenache-nodejs-link')
const config = require('config')
const { CustomLogger } = require('./log.service')
const { checkGrenacheClientConf } = require('./helpers')

checkGrenacheClientConf()

const logger = new CustomLogger({
  label: ':grenache:client:http'
}).createLogger()

const gClientConf = config.get('grenacheClient')

const Peer = Grenache.PeerRPCClient

const link = new Link({
  grape: gClientConf.grape
})

link.start()

const peer = new Peer(link, { requestTimeout: 90000 })

peer.init()

const request = (query, cb) => {
  return new Promise((resolve, reject) => {
    peer.request(
      gClientConf.query,
      query,
      { timeout: 90000 },
      (err, data) => {
        if (err) {
          logger.debug(`Found error at ${err.stack || err}`)
          reject(err)

          if (typeof cb === 'function') {
            cb(err)
          }

          return
        }

        if (typeof cb === 'function') {
          cb(err, data)

          return
        }

        resolve(data)
      }
    )
  })
}

module.exports = {
  request
}
