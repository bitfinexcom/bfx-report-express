'use strict'

const { copyFile, rm } = require('node:fs/promises')
const path = require('node:path')
const { assert } = require('chai')
const request = require('supertest')

const {
  startEnvironment,
  stopEnvironment
} = require('@bitfinex/bfx-report/test/helpers/helpers.boot')
const {
  createMockRESTv2SrvWithDate
} = require('@bitfinex/bfx-report/test/helpers/helpers.mock-rest-v2')

process.env.NODE_CONFIG_DIR = path.join(__dirname, 'config')
const { app } = require('../index')
const agent = request.agent(app)

const basePath = '/api'
const date = new Date()
const end = date.getTime()
const start = (new Date()).setDate(date.getDate() - 1)
const auth = {
  apiKey: 'fake',
  apiSecret: 'fake'
}
const mainWorkerConfigPath = path.join(__dirname, '../node_modules/@bitfinex/bfx-report/config')
const workerConfigPaths = [
  { from: 'common.json.example', to: 'common.json' },
  { from: 'service.report.json.example', to: 'service.report.json' },
  { from: 'facs/grc.config.json.example', to: 'facs/grc.config.json' },
  { from: 'facs/grc-slack.config.json.example', to: 'facs/grc-slack.config.json' }
]

let mockRESTv2Srv = null

const copyWorkerConfigs = async () => {
  for (const { from, to } of workerConfigPaths) {
    await copyFile(
      path.join(mainWorkerConfigPath, from),
      path.join(mainWorkerConfigPath, to)
    )
  }
}

const rmWorkerConfigs = async () => {
  for (const { to } of workerConfigPaths) {
    await rm(
      path.join(mainWorkerConfigPath, to),
      {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 300
      }
    )
  }
}

describe('API', () => {
  before(async function () {
    this.timeout(20000)

    mockRESTv2Srv = createMockRESTv2SrvWithDate(start, end, 2)

    await copyWorkerConfigs()
    await startEnvironment(true, true)
  })

  after(async function () {
    this.timeout(20000)

    try {
      await mockRESTv2Srv.close()
    } catch (err) {}

    await stopEnvironment()
    await rmWorkerConfigs()
  })

  it('it should be successfully auth', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        method: 'verifyUser',
        auth,
        id: 5
      })
      .expect('Content-Type', /json/)
      .expect(200)

    assert.isObject(res.body)
    assert.isObject(res.body.result)
    assert.isString(res.body.result.username)
    assert.isString(res.body.result.timezone)
    assert.isString(res.body.result.email)
    assert.isNumber(res.body.result.id)
    assert.isBoolean(res.body.result.isSubAccount)
    assert.isBoolean(res.body.result.isUserMerchant)
    assert.strictEqual(res.body.result.email, 'fake@email.fake')
    assert.propertyVal(res.body, 'id', 5)
  })

  it('it should not be successfully auth', async function () {
    this.timeout(5000)

    const res = await agent
      .post(`${basePath}/json-rpc`)
      .type('json')
      .send({
        method: 'verifyUser',
        auth: {
          apiKey: '',
          apiSecret: ''
        }
      })
      .expect('Content-Type', /json/)
      .expect(401)

    assert.isObject(res.body)
    assert.isObject(res.body.error)
    assert.propertyVal(res.body.error, 'code', 401)
    assert.propertyVal(res.body.error, 'message', 'Unauthorized')
    assert.isObject(res.body.error.data)
    assert.propertyVal(res.body, 'id', null)
    assert.isString(res.body.jsonrpc)
  })
})
