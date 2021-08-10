'use strict'

const { jsonRpcResponder } = require('../services/helpers')

module.exports = (err, req, res, next) => {
  jsonRpcResponder(req, res, err)
}
