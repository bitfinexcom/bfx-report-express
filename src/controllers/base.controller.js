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

const auth = async (req, res) => {
  const xAuthTokenHeader = req.headers?.['x-auth-token']
  const xOriginalURIHeader = req.headers?.['x-original-uri']
  const params = xOriginalURIHeader.split('?')[1]

  const queryToken = req.query?.token ?? null
  const uriToken = new URLSearchParams(params).get('token')
  const headerToken = (uriToken && typeof uriToken === 'string')
    ? uriToken
    : xAuthTokenHeader
  const token = (queryToken && typeof queryToken === 'string')
    ? queryToken
    : headerToken

  if (!token) {
    res.status(401).send()

    return
  }

  const query = {
    action: 'verifyUser',
    args: [{ auth: { token } }]
  }

  const rpcRes = await grenacheClientService.request(query)

  jsonRpcResponder(req, res, rpcRes)
}

module.exports = {
  jsonRpc,
  auth
}
