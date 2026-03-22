import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { flushLogs } from '../helpers/flushLogs.js'
import { buildTestApp } from '../helpers/buildTestApp.js'
import { getEventLogs, getRequestSummaryLogs } from '../helpers/log-helpers.js'

describe('gateway rate limit pipeline', () => {
  it('returns 429 RATE_LIMITED and logs limiter metadata for per-IP scope', async () => {
    const { app, logs, resetLogs } = buildTestApp((app) => {
      let hits = 0

      app.post('/__test/rate-limit-ip', (req, res, next) => {
        hits += 1

        if (hits > 1) {
          const err = new Error('rate limited')
          err.statusCode = 429
          err.limiterName = 'register_per_ip'
          err.scope = 'ip'
          err.clientIp = req.ip
          return next(err)
        }

        return res.status(201).json({
          requestId: req.requestId,
          ok: true,
        })
      })
    })

    await request(app).post('/__test/rate-limit-ip').send({})
    await flushLogs()
    resetLogs()

    const res = await request(app).post('/__test/rate-limit-ip').send({})
    await flushLogs()

    // Assert response
    expect(res.status).toBe(429)
    expect(res.body).toMatchObject({
      errorCode: 'RATE_LIMITED',
      message: 'request rejected',
    })
    expect(typeof res.body.requestId).toBe('string')
    expect(res.body).not.toHaveProperty('limiterName')
    expect(res.body).not.toHaveProperty('scope')
    expect(res.body).not.toHaveProperty('clientIp')

    // Assert logs
    const semanticLogs = getEventLogs(logs, 'gateway.expected_rejection')
    expect(semanticLogs).toHaveLength(1)

    expect(semanticLogs[0]).toMatchObject({
      event: 'gateway.expected_rejection',
      status: 429,
      errorCode: 'RATE_LIMITED',
      method: 'POST',
      path: '/__test/rate-limit-ip',
      limiterName: 'register_per_ip',
      scope: 'ip',
      msg: 'request rejected',
    })

    expect(typeof semanticLogs[0].clientIp).toBe('string')
    expect(semanticLogs[0]).not.toHaveProperty('accountKey')

    expect(getRequestSummaryLogs(logs)).toHaveLength(0)
  })

  it('returns 429 RATE_LIMITED and logs accountKey for per-account scope', async () => {
    const { app, logs, resetLogs } = buildTestApp((app) => {
      let hits = 0

      app.post('/__test/rate-limit-account', (req, res, next) => {
        hits += 1

        if (hits > 1) {
          const err = new Error('rate limited')
          err.statusCode = 429
          err.limiterName = 'login_per_account'
          err.scope = 'account'
          err.clientIp = req.ip
          err.accountKey = 'huca'
          return next(err)
        }

        return res.status(200).json({
          requestId: req.requestId,
          ok: true,
        })
      })
    })

    await request(app)
      .post('/__test/rate-limit-account')
      .send({ username: 'huca' })
    await flushLogs()
    resetLogs()

    const res = await request(app)
      .post('/__test/rate-limit-account')
      .send({ username: 'huca' })

    await flushLogs()

    // Assert response
    expect(res.status).toBe(429)
    expect(res.body).toMatchObject({
      errorCode: 'RATE_LIMITED',
      message: 'request rejected',
    })
    expect(typeof res.body.requestId).toBe('string')
    expect(res.body).not.toHaveProperty('accountKey')

    // Assert logs
    const semanticLogs = getEventLogs(logs, 'gateway.expected_rejection')
    expect(semanticLogs).toHaveLength(1)

    expect(semanticLogs[0]).toMatchObject({
      event: 'gateway.expected_rejection',
      status: 429,
      errorCode: 'RATE_LIMITED',
      method: 'POST',
      path: '/__test/rate-limit-account',
      limiterName: 'login_per_account',
      scope: 'account',
      accountKey: 'huca',
      msg: 'request rejected',
    })

    expect(typeof semanticLogs[0].clientIp).toBe('string')
    expect(getRequestSummaryLogs(logs)).toHaveLength(0)
  })
})