import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { flushLogs } from './helpers/flushLogs.js'
import { buildTestApp } from './helpers/buildTestApp.js'
import { getEventLogs, getRequestSummaryLogs } from './helpers/log-helpers.js'

describe('gateway not found pipeline', () => {
  it('returns 404 NOT_FOUND and emits one semantic log only', async () => {
    const { app, logs } = buildTestApp()

    const res = await request(app).post('/__test/not-found')
    await flushLogs()

    // Assert response
    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({
      errorCode: 'NOT_FOUND',
      message: 'request rejected',
    })
    expect(typeof res.body.requestId).toBe('string')

    // Assert logs
    const semanticLogs = getEventLogs(logs, 'gateway.expected_rejection')
    expect(semanticLogs).toHaveLength(1)

    expect(semanticLogs[0]).toMatchObject({
      event: 'gateway.expected_rejection',
      status: 404,
      errorCode: 'NOT_FOUND',
      method: 'POST',
      path: '/__test/not-found',
      msg: 'request rejected',
    })

    expect(getRequestSummaryLogs(logs)).toHaveLength(0)
  })
})