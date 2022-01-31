'use strict'

const { Router } = require('express')

const router = new Router()
module.exports = router

const { asyncErrorCatcher } = require('../services/helpers')
const controllers = require('../controllers')
const baseController = asyncErrorCatcher(controllers.baseController)

router.post('/json-rpc', baseController.jsonRpc)
router.get('/auth', baseController.auth)

/**
 * @deprecated
 * The endpoint will be removed in the future, now need to use `/json-rpc` one
 */
router.post('/get-data', baseController.jsonRpc)
