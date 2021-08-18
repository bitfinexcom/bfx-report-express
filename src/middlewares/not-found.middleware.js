'use strict'

const {
  jsonRpcResponder,
  JSON_RPC_VERSION
} = require('../services/helpers/responses')

module.exports = (req, res, next) => {
  jsonRpcResponder(req, res, {
    jsonrpc: JSON_RPC_VERSION,
    error: {
      code: 404,
      message: 'Not found'
    }
  })
}
