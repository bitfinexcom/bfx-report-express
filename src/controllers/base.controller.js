'use strict'

const { grenacheClientService } = require('../services')
const { success } = require('../services/helpers/responses')

const jsonRpc = async (req, res) => {
  const body = { ...req.body }
  const {
    id = null,
    method: action = ''
  } = body
  delete body.method
  const query = {
    action,
    args: [body]
  }

  const result = await grenacheClientService.request(query)

  success(200, { result, id }, res)
}

module.exports = {
  jsonRpc
}
