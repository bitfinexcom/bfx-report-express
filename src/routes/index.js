'use strict'

const { Router } = require('express')

const router = new Router()
module.exports = router

const { asyncErrorCatcher } = require('../services/helpers')
const controllers = require('../controllers')
const {
  checkAuth,
  checkStoredLocally,
  getData,
  verifyDigitalSignature
} = asyncErrorCatcher(controllers.baseController)

router.post('/check-auth', checkAuth)
router.post('/check-stored-locally', checkStoredLocally)
router.post('/get-data', getData)
router.post('/verify-digital-signature', verifyDigitalSignature)
