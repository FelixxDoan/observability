import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { flushLogs } from '../helpers/flushLogs.js'
import { buildTestApp } from '../helpers/buildTestApp.js'
import { getEventLogs, getRequestSummaryLogs } from '../helpers/log-helpers.js'

describe('gateway auth rejection pipeline', () => {
  it('returns 401 UNAUTHORIZED and logs expected rejection without stack', async () => {
    const { app, logs } = buildTestApp((app) => {
      app.get('/__test/unauthorized', (req, res, next) => {
        const err = new Error('unauthorized')
        err.statusCode = 401
        return next(err)
      })
    })

    const res = await request(app).get('/__test/unauthorized')
    await flushLogs()

    // Assert response
    expect(res.status).toBe(401)
    expect(res.body).toMatchObject({
      errorCode: 'UNAUTHORIZED',
      message: 'request rejected',
    })
    expect(typeof res.body.requestId).toBe('string')

    // Assert logs
    const semanticLogs = getEventLogs(logs, 'gateway.expected_rejection')
    expect(semanticLogs).toHaveLength(1)

    expect(semanticLogs[0]).toMatchObject({
      event: 'gateway.expected_rejection',
      status: 401,
      errorCode: 'UNAUTHORIZED',
      method: 'GET',
      path: '/__test/unauthorized',
      msg: 'request rejected',
    })

    expect(semanticLogs[0]).not.toHaveProperty('errorStack')
    expect(getRequestSummaryLogs(logs)).toHaveLength(0)
  })

  it('returns 403 FORBIDDEN and logs expected rejection without stack', async () => {
    const { app, logs } = buildTestApp((app) => {
      app.get('/__test/forbidden', (req, res, next) => {
        const err = new Error('forbidden')
        err.statusCode = 403
        return next(err)
      })
    })

    const res = await request(app).get('/__test/forbidden')
    await flushLogs()

    // Assert response
    expect(res.status).toBe(403)
    expect(res.body).toMatchObject({
      errorCode: 'FORBIDDEN',
      message: 'request rejected',
    })
    expect(typeof res.body.requestId).toBe('string')

    // Assert logs
    const semanticLogs = getEventLogs(logs, 'gateway.expected_rejection')
    expect(semanticLogs).toHaveLength(1)

    expect(semanticLogs[0]).toMatchObject({
      event: 'gateway.expected_rejection',
      status: 403,
      errorCode: 'FORBIDDEN',
      method: 'GET',
      path: '/__test/forbidden',
      msg: 'request rejected',
    })

    expect(semanticLogs[0]).not.toHaveProperty('errorStack')
    expect(getRequestSummaryLogs(logs)).toHaveLength(0)
  })
})