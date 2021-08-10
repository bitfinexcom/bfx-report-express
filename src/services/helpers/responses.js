'use strict'

const { logger } = require('../log.service')

const JSON_RPC_VERSION = '2.0'

const jsonRpcResponder = (req, res, rpcRes) => {
  const _body = (
    req.body &&
    typeof req.body === 'object'
  )
    ? req.body
    : {}
  const { id: reqId = null } = _body

  if (
    !rpcRes ||
    typeof rpcRes !== 'object' ||
    typeof rpcRes.jsonrpc !== 'string' ||
    rpcRes instanceof Error
  ) {
    const code = 500
    const message = 'Internal Server Error'

    logger.error(rpcRes.stack || rpcRes)

    res.status(code)
    res.json({
      jsonrpc: JSON_RPC_VERSION,
      error: { code, message, data: null },
      id: reqId
    })

    return res
  }

  const { jsonrpc, error, id = reqId } = rpcRes

  if (
    error &&
    typeof error === 'object'
  ) {
    const {
      code = 500,
      message = 'Internal Server Error',
      data = null
    } = error

    res.status(code)
    res.json({
      jsonrpc,
      error: { code, message, data },
      id
    })
  }

  res.status(200)
  res.json(rpcRes)

  return res
}

module.exports = {
  jsonRpcResponder,
  JSON_RPC_VERSION
}
