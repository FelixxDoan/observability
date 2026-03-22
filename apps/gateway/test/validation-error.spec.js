import request from 'supertest'
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// sửa path này theo codebase thật của mày
import { validateMiddleWare } from '@acme/observability'

import { flushLogs } from '../helpers/flushLogs.js'
import { buildTestApp } from '../helpers/buildTestApp.js'
import { getEventLogs, getRequestSummaryLogs } from '../helpers/log-helpers.js'

describe('gateway validation error pipeline', () => {
  it('returns 400 VALIDATION_ERROR and logs sanitized validation metadata', async () => {
    const { app, logs } = buildTestApp((app) => {
      const bodySchema = z.object({
        username: z.string()
          .trim()
          .min(1, "Username is required")
          .max(54, "Username must be at most 54 characters")
          .regex(/^\S+$/, "Username must not contain spaces"),
        password: z
          .string()
          .min(8, "Password must be at least 8 characters")
          .max(72, "Password must be at most 72 characters"),
        email: z
          .string()
          .trim()
          .min(1, "Email is required")
          .email("Invalid email address")
          .transform((value) => value.toLowerCase()),
      })

      const routeSchema = z.object({
        body: bodySchema,
        query: z.object({}).optional(),
        params: z.object({}).optional()
      })

      app.post(
        '/__test/validation',
        validateMiddleWare(
          routeSchema
        ),
        (req, res) => {
          return res.status(200).json({
            requestId: req.requestId,
            ok: true,
          })
        },
      )
    })

    const res = await request(app)
      .post('/__test/validation')
      .send({})

    await flushLogs()

    console.log('STATUS =', res.status)
    console.log('BODY =', JSON.stringify(res.body, null, 2))
    console.log('LOGS =', JSON.stringify(logs, null, 2))

    // Assert response
    expect(res.status).toBe(400)
    expect(res.body).toMatchObject({
      errorCode: 'VALIDATION_ERROR',
      message: 'request rejected',
    })
    expect(typeof res.body.requestId).toBe('string')
    expect(res.body.details).toBeDefined()

    expect(res.body.details.fieldErrors).toMatchObject({
      'body.username': expect.any(Array),
      'body.password': expect.any(Array),
      'body.email': expect.any(Array),
    })

    // Assert logs
    const semanticLogs = getEventLogs(logs, 'gateway.expected_rejection')
    expect(semanticLogs).toHaveLength(1)

    expect(semanticLogs[0]).toMatchObject({
      event: 'gateway.expected_rejection',
      status: 400,
      errorCode: 'VALIDATION_ERROR',
      method: 'POST',
      path: '/__test/validation',
      invalidFieldCount: 3,
      validationTargets: ['body'],
      msg: 'request rejected',
    })

    expect(semanticLogs[0]).not.toHaveProperty('errorStack')
    expect(semanticLogs[0]).not.toHaveProperty('details')

    expect(getRequestSummaryLogs(logs)).toHaveLength(0)
  })
})