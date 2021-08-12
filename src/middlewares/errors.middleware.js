'use strict'

const {
  jsonRpcResponder
} = require('../services/helpers/responses')

module.exports = (err, req, res, next) => {
  jsonRpcResponder(req, res, err)
}
