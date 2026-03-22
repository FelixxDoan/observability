import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { flushLogs } from '../helpers/flushLogs.js'
import { buildTestApp } from '../helpers/buildTestApp.js'
import { getEventLogs, getRequestSummaryLogs } from '../helpers/log-helpers.js'

describe('gateway upstream failure pipeline', () => {
  it('returns 504 UPSTREAM_TIMEOUT and emits upstream-failure semantic log', async () => {
    const { app, logs } = buildTestApp((app) => {
      app.get('/__test/upstream-timeout', (req, res, next) => {
        const err = new Error('Auth service timed out')
        err.statusCode = 504
        return next(err)
      })
    })

    const res = await request(app).get('/__test/upstream-timeout')
    await flushLogs()

    // Assert response
    expect(res.status).toBe(504)
    expect(res.body).toMatchObject({
      errorCode: 'UPSTREAM_TIMEOUT',
      message: 'upstream request failed',
    })
    expect(typeof res.body.requestId).toBe('string')

    // Assert logs
    const semanticLogs = getEventLogs(logs, 'gateway.upstream_failure')
    expect(semanticLogs).toHaveLength(1)

    expect(semanticLogs[0]).toMatchObject({
      event: 'gateway.upstream_failure',
      status: 504,
      errorCode: 'UPSTREAM_TIMEOUT',
      method: 'GET',
      path: '/__test/upstream-timeout',
      msg: 'upstream request failed',
    })

    expect(getRequestSummaryLogs(logs)).toHaveLength(0)
  })
})