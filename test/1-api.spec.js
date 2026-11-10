'use strict'

const path = require('node:path')
const { assert } = require('chai')
const request = require('supertest')
const {
  grapes: createGrapes,
  fxgrenache: createFxGrenache
} = require('@bitfinex/bfx-svc-test-helper')

process.env.NODE_CONFIG_DIR = path.join(__dirname, 'config')
const config = require('config')
const grcSrvName = config.get('grenacheClient.query')
const basePath = '/api'
const auth = {
  apiKey: 'fake',
  apiSecret: 'fake'
}

const grapes = createGrapes()

const makeJsonRpcResponse = (args, result) => {
  const jsonrpc = '2.0'
  const id = args?.id ?? null

  if (result instanceof Error) {
    const {
      code,
      message,
      data
    } = result

    return {
      jsonrpc,
      error: { code, message, data },
      id
    }
  }

  return { jsonrpc, result, id }
}

const stubs = {
  [grcSrvName]: {
    verifyUser (space, args, cb) {
      const { apiKey, apiSecret } = args?.auth ?? {}

      if (
        apiKey !== auth.apiKey ||
        apiSecret !== auth.apiSecret
      ) {
        const error = new Error('Unauthorized')
        error.code = 401
        error.data = { someExtraData: null }

        cb(null, makeJsonRpcResponse(args, error))

        return
      }

      cb(null, makeJsonRpcResponse(args, {
        id: 12345,
        username: 'fake_user',
        timezone: 'UTC',
        email: 'fake@email.fake',
        isSubAccount: false,
        isUserMerchant: false
      }))
    }
  }
}

describe('API', () => {
  let fxg = null
  let server = null
  let agent = null

  before(async function () {
    this.timeout(20000)

    await grapes.start()
    fxg = createFxGrenache(stubs, grapes)
    await fxg.start()
    server = await new Promise((resolve) => {
      const { app } = require('../index')
      agent = request.agent(app)
      app.on('listened', resolve)
    })
  })

  after(async function () {
    this.timeout(20000)

    await new Promise((resolve) => {
      server.close(resolve)
    })
    await fxg.stop()
    await grapes.stop()
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
