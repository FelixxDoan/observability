//gateway

import express from 'express'

import {
    healthzHandler,
    readyzHandler,
    requestIdMiddleware,
    createLogger,
    httpLoggerMiddleware,
    createMetrics,
    errorHandler,
    notFoundMiddleware,
    validateMiddleWare,
    loginRouteSchema,
    registerRouteSchema,
    userQueryRouteSchema,
    userParamsRouteSchema
} from '@acme/observability'

import { handleErrorRespones, handleSuccessResponse } from './helper/harden.js'

import { registerPerIp } from './store/policy.js'


import config from './config/env.js'
import { createRateLimitMiddleware } from './middleware/rateLimit.js';

const { port, authUrl, upstreamTimeoutMs, nodeEnv, version, serviceName } = config

const app = express()

const logger = createLogger({ serviceName, nodeEnv, version })

app.use(requestIdMiddleware())
app.use(httpLoggerMiddleware(logger))

app.use(express.json())

const { metricsHandler, metricsMiddleware } = createMetrics({ serviceName })

app.use(metricsMiddleware())

app.get('/ping', async (req, res, next) => {

    const { requestId } = req

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs)

    try {
        const result = await fetch(`${authUrl}/ping`, {
            method: "GET",
            headers: { "x-request-id": requestId },
            signal: controller.signal
        })

        if (!result.ok) {
            const err = new Error("Test auth failed!!")
            err.statusCode = result.status
            err.code = 'TEST_AUTH_ERROR'
            throw err
        }

        const data = await result.json()
        res.json({ ok: true, requestId, status: result.status, auth: data })

    } catch (error) {
        if (error?.name === "AbortError") {
            const e = new Error("Test auth timemout")
            e.statusCode = 504
            e.code = "TEST_TIMEOUT"
            e.cause = error
            return next(e)
        }
        return next(error)
    } finally {
        clearTimeout(timeout)
    }
})


app.post('/login', validateMiddleWare(loginRouteSchema), async (req, res, next) => {

    const { requestId } = req

    const { username, password } = req.validated.body

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs)

    try {
        const result = await fetch(`${authUrl}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-request-id": requestId
            },
            body: JSON.stringify({
                username,
                password
            }),
            signal: controller.signal
        })

        if (!result.ok) {
            return handleErrorRespones(result, next)
        }

        return handleSuccessResponse(result, res)
    } catch (error) {
        if (error?.name === "AbortError") {
            const e = new Error("Auth service timed out")
            e.statusCode = 504
            e.code = "UPSTREAM_TIMEOUT"
            e.cause = error
            return next(e)
        }
        const e = new Error("Internal server error")
        e.statusCode = 500
        return next(e)
    } finally {
        clearTimeout(timeout)
    }

})

app.post('/register', validateMiddleWare(registerRouteSchema), createRateLimitMiddleware(registerPerIp), async (req, res, next) => {
    const { requestId } = req

    const { name, username, password, confirmPassword, email } = req.validated.body

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs)

    try {
        const result = await fetch(`${authUrl}/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-request-id": requestId
            },
            body: JSON.stringify({
                name,
                username,
                password,
                confirmPassword,
                email
            }),
            signal: controller.signal
        })

        if (!result.ok) {
            return handleErrorRespones(result, next)
        }

        return handleSuccessResponse(result, res)

    } catch (error) {
        if (error?.name === "AbortError") {
            const e = new Error("Auth service timed out")
            e.statusCode = 504
            e.cause = error
            return next(e)
        }
        const e = new Error("Internal server error")
        e.statusCode = 500
        return next(e)
    } finally {
        clearTimeout(timeout)
    }
})

app.get('/metrics', (req, res) => {
    metricsHandler(req, res)
})

app.get('/users', validateMiddleWare(userQueryRouteSchema), async (req, res, next) => {
    const { requestId } = req

    const { page, limit } = req.validated.query

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs)

    try {
        const result = await fetch(`${authUrl}/users?page=${page}&limit=${limit}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-request-id": requestId
            },
            signal: controller.signal
        })
        const data = await result.json()

        res.status(result.status).json({ ok: true, requestId, user: data })
    } catch (error) {
        next(error)
    } finally {
        clearTimeout(timeout)
    }
})


app.get('/users/:userId', validateMiddleWare(userParamsRouteSchema), async (req, res, next) => {
    const { requestId } = req

    const { userId } = req.validated.params

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs)
    try {
        const result = await fetch(`${authUrl}/users/${userId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "x-request-id": requestId
            },
            signal: controller.signal
        })
        const data = await result.json()

        res.status(result.status).json({ ok: true, requestId, user: data })
    } catch (error) {
        next(error)
    } finally {
        clearTimeout(timeout)
    }
})

app.get('/healthz', healthzHandler)
app.get('/readyz', readyzHandler)

app.get('/test-string', async (req, res, next) => {

    const { requestId } = req

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs)

    try {
        const result = await fetch(`${authUrl}/test-string`, {
            method: "GET",
            headers: { "x-request-id": requestId },
            signal: controller.signal
        })

        if (!result.ok) return handleErrorRespones(result, next)

        return handleSuccessResponse(result, res)

    } catch (error) {
       
        const e = new Error("Internal server error")
        e.statusCode = "500"
        return next(e)
    } finally {
        clearTimeout(timeout)
    }
})

app.get('/__test/error-status-string', (req, res, next) => {
  const err = new Error('boom')
  err.status = '500'
  return next(err)
})

app.use(notFoundMiddleware())
app.use(errorHandler({ logger, serviceName }))

app.listen(port, () => {
    logger.info({ port }, "service started")
})