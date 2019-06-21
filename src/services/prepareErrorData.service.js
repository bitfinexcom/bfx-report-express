'use strict'

const { logger } = require('./log.service')

const _isAuthError = (err) => {
  return /(missing api key or secret)|(apikey: digest invalid)|(apikey: invalid)|(ERR_AUTH_UNAUTHORIZED)|(Cannot read property 'email')/.test(err.toString())
}

const _isHasJobInQueueError = (err) => {
  return /ERR_HAS_JOB_IN_QUEUE/.test(err.toString())
}

const _isNonceSmallError = (err) => {
  return /nonce: small/.test(err.toString())
}

const _isTimeFrameMoreThanMonthError = (err) => {
  return /ERR_TIME_FRAME_MORE_THAN_MONTH/.test(err.toString())
}

const _isGreaterLimitNeededError = (err) => {
  return /ERR_GREATER_LIMIT_IS_NEEDED/.test(err.toString())
}

const _isDuringSyncMethodAccessError = (err) => {
  return /ERR_DURING_SYNC_METHOD_IS_NOT_AVAILABLE/.test(err.toString())
}

module.exports = (err, log = logger) => {
  log.error(err.stack || err)

  if (_isAuthError(err)) {
    err.statusCode = 401
    err.statusMessage = 'Unauthorized'
  }
  if (_isHasJobInQueueError(err)) {
    err.statusCode = 401
    err.statusMessage = 'Spam restriction mode, user already has an export on queue'
  }
  if (_isNonceSmallError(err)) {
    err.statusMessage = 'Nonces error, key are updated, please get new keys to operate'
  }
  if (_isTimeFrameMoreThanMonthError(err)) {
    err.statusCode = 400
    err.statusMessage = 'For public trades export please select a time frame smaller than a month'
  }
  if (_isGreaterLimitNeededError(err)) {
    err.statusCode = 400
    err.statusMessage = 'A greater limit is needed as to show the data correctly'
  }
  if (_isDuringSyncMethodAccessError(err)) {
    err.statusCode = 400
    err.statusMessage = 'Sync with db is taking place, please wait till sync is completed and then try again'
  }

  return {
    code: err.statusCode
      ? err.statusCode
      : 500,
    message: err.statusMessage
      ? err.statusMessage
      : 'Internal Server Error'
  }
}
