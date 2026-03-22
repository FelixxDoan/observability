import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { flushLogs } from '../helpers/flushLogs.js'
import { buildTestApp } from '../helpers/buildTestApp.js'
import { getEventLogs, getRequestSummaryLogs } from '../helpers/log-helpers.js'

describe('gateway error normalization pipeline', () => {
  it('normalizes string err.status to 500 INTERNAL_ERROR and emits one semantic log', async () => {
    const { app, logs } = buildTestApp((app) => {
      app.get('/__test/error-status-string', (req, res, next) => {
        const err = new Error('boom')
        err.status = '500'
        return next(err)
      })
    })

    const res = await request(app).get('/__test/error-status-string')
    await flushLogs()

    // Assert response
    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({
      errorCode: 'INTERNAL_ERROR',
      message: 'unexpected server error',
    })
    expect(typeof res.body.requestId).toBe('string')

    // Assert logs
    const semanticLogs = getEventLogs(logs, 'gateway.unexpected_server')
    expect(semanticLogs).toHaveLength(1)

    expect(semanticLogs[0]).toMatchObject({
      event: 'gateway.unexpected_server',
      status: 500,
      errorCode: 'INTERNAL_ERROR',
      method: 'GET',
      path: '/__test/error-status-string',
      errorType: 'Error',
      errorMessage: 'boom',
      msg: 'unexpected server error',
    })

    expect(typeof semanticLogs[0].requestId).toBe('string')
    expect(typeof semanticLogs[0].errorStack).toBe('string')

    expect(getRequestSummaryLogs(logs)).toHaveLength(0)
  })
})