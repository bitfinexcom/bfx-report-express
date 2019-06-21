'use strict'

const {
  helpers,
  prepareErrorDataService
} = require('../services')
const { failure } = helpers.responses

module.exports = (err, req, res, next) => {
  const id = (req.body && req.body.id) || null

  const {
    code,
    message
  } = prepareErrorDataService(err)

  failure(
    code,
    message,
    res,
    id
  )
}
