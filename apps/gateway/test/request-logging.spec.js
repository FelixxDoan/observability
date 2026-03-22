import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { flushLogs } from '../helpers/flushLogs.js'
import { buildTestApp } from '../helpers/buildTestApp.js'
import { getRequestSummaryLogs } from '../helpers/log-helpers.js'

describe('gateway request transport logging', () => {
  it('keeps request summary log for 2xx responses', async () => {
    const { app, logs } = buildTestApp((app) => {
      app.get('/__test/ok', (req, res) => {
        return res.status(200).json({
          requestId: req.requestId,
          ok: true,
        })
      })
    })

    const res = await request(app).get('/__test/ok')
    await flushLogs()

    // Assert response
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      ok: true,
    })
    expect(typeof res.body.requestId).toBe('string')

    // Assert logs
    const requestSummaryLogs = getRequestSummaryLogs(logs)
    expect(requestSummaryLogs).toHaveLength(1)

    expect(requestSummaryLogs[0]).toMatchObject({
      msg: 'request completed',
    })

    expect(requestSummaryLogs[0].req.method).toBe('GET')
    expect(requestSummaryLogs[0].req.url).toBe('/__test/ok')
    expect(requestSummaryLogs[0].res.statusCode).toBe(200)
  })
})