'use strict'

const { grenacheClientService } = require('../services')
const {
  jsonRpcResponder
} = require('../services/helpers/responses')

const jsonRpc = async (req, res) => {
  const body = { ...req.body }
  const { method: action = '' } = body
  delete body.method

  const query = {
    action,
    args: [body]
  }

  const rpcRes = await grenacheClientService.request(query)

  jsonRpcResponder(req, res, rpcRes)
}

module.exports = {
  jsonRpc
}
