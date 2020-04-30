'use strict'

const {
  grenacheClientService: gClientService,
  helpers
} = require('../services')
const { success } = helpers.responses

const checkStoredLocally = async (req, res) => {
  const body = { ...req.body }
  const { id = null } = body

  const queryS3 = {
    action: 'lookUpFunction',
    args: [{
      params: { service: 'rest:ext:s3' }
    }]
  }
  const querySendgrid = {
    action: 'lookUpFunction',
    args: [{
      params: { service: 'rest:ext:sendgrid' }
    }]
  }
  const queryGetUser = {
    action: 'verifyUser',
    args: [body]
  }

  const countS3Services = await gClientService
    .request(queryS3)
  const countSendgridServices = await gClientService
    .request(querySendgrid)

  if (
    !countS3Services ||
    !countSendgridServices
  ) {
    success(200, { result: false, id }, res)

    return
  }

  const { email } = await gClientService
    .request(queryGetUser)
  success(200, { result: email, id }, res)
}

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

  const result = await gClientService.request(query)

  success(200, { result, id }, res)
}

module.exports = {
  checkStoredLocally,
  jsonRpc
}
