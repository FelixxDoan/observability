import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { flushLogs } from '../helpers/flushLogs.js'
import { buildTestApp } from '../helpers/buildTestApp.js'
import { getEventLogs, getRequestSummaryLogs } from '../helpers/log-helpers.js'

describe('gateway internal error pipeline', () => {
  it('returns 500 INTERNAL_ERROR for a plain server error and logs full error context', async () => {
    const { app, logs } = buildTestApp((app) => {
      app.get('/__test/internal-error', (req, res, next) => {
        return next(new Error('boom'))
      })
    })

    const res = await request(app).get('/__test/internal-error')
    await flushLogs()

    // Assert response
    expect(res.status).toBe(500)
    expect(res.body).toMatchObject({
      errorCode: 'INTERNAL_ERROR',
      message: 'unexpected server error',
    })
    expect(typeof res.body.requestId).toBe('string')

    expect(JSON.stringify(res.body)).not.toContain('boom')
    expect(JSON.stringify(res.body)).not.toContain('Error:')

    // Assert logs
    const semanticLogs = getEventLogs(logs, 'gateway.unexpected_server')
    expect(semanticLogs).toHaveLength(1)

    expect(semanticLogs[0]).toMatchObject({
      event: 'gateway.unexpected_server',
      status: 500,
      errorCode: 'INTERNAL_ERROR',
      method: 'GET',
      path: '/__test/internal-error',
      errorType: 'Error',
      errorMessage: 'boom',
      msg: 'unexpected server error',
    })

    expect(typeof semanticLogs[0].requestId).toBe('string')
    expect(typeof semanticLogs[0].errorStack).toBe('string')

    expect(getRequestSummaryLogs(logs)).toHaveLength(0)
  })
})