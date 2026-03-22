import request from 'supertest'
import { describe, it, expect } from 'vitest'

import { buildTestApp } from '../helpers/buildTestApp.js'

describe('gateway app smoke test', () => {
  it('responds to a test route', async () => {
    const { app } = buildTestApp((app) => {
      app.get('/__test/ping', (req, res) => {
        return res.status(200).json({ ok: true })
      })
    })

    const res = await request(app).get('/__test/ping')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
  })
})