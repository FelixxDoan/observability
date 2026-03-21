import express from 'express'
import {
    createLogger,
    httpLoggerMiddleware,
    createMetrics,
    requestIdMiddleware,
    healthzHandler,
    readyzHandler,
    errorHandler,
    validateMiddleWare,
    loginRouteSchema,
    notFoundMiddleware,
    registerRouteSchema,
    userQueryRouteSchema,
    userParamsRouteSchema
} from '@acme/observability';


const app = express()

const serviceName = process.env.SERVICE_NAME
const env = process.env.NODE_ENV
const version = process.env.VERSION

const logger = createLogger({ serviceName, env, version })

app.use(requestIdMiddleware())
app.use(httpLoggerMiddleware(logger))

app.use(express.json())

const { metricsHandler, metricsMiddleware } = createMetrics({ serviceName })

app.use(metricsMiddleware())

app.get('/healthz', healthzHandler)
app.get('/readyz', readyzHandler)

app.get("/metrics", (req, res) => metricsHandler(req, res))

app.get('/ping', (req, res) => {
    const { requestId } = req

    res.json({ requestId, message: "Ping okee !!" })
})

app.post('/login', validateMiddleWare(loginRouteSchema), async (req, res, next) => {
    const { requestId } = req
    const { username, password } = req.validated.body
    const controller = new AbortController()
    const timout = setTimeout(() => controller.abort(), 2000)
    try {
        const userProfile = {
            name: 'hihi',
            age: 32
        }

        return res.status(200).json({ requestId, message: 'login success', userProfile })

    } catch (error) {
        next(error)
    } finally {
        clearTimeout(timout)
    }
})

app.post('/register', validateMiddleWare(registerRouteSchema), async (req, res, next) => {
    const { requestId } = req

    const { name, username, password, confirmPassword, email } = req.validated.body
    const controller = new AbortController()
    const timout = setTimeout(() => controller.abort(), 2000)
    try {
        const info = {
            name, email
        }

        res.status(200).json({ requestId, message: "Register donee", info })

    } catch (error) {
        next(error)

    } finally {
        clearTimeout(timout)
    }
})

app.get('/users', validateMiddleWare(userQueryRouteSchema), async (req, res, next) => {
    const { requestId } = req

    const { page, limit } = req.validated.query

    try {
        const lstUser = [
            {
                name: "nguyen vnaw a",
                age: 30,
            },
            {
                name: "nguyen vnaw a",
                age: 30,
            },
            {
                name: "nguyen vnaw a",
                age: 30,
            }
        ]

        res.status(200).json({requestId, message: "your list", lstUser})
    } catch (error) {
        next(error)
    }
})

app.get('/users/:userId', validateMiddleWare(userParamsRouteSchema), async (req, res, next) => {
    const { requestId } = req

    const { userId } = req.validated.params

    try {
        const user = {
            name: 'nguyen van a',
            age: 21
        }

        res.status(200).json({requestId, message: "your user", user})
    } catch (error) {
        next(error)
    }
})

app.get('/test-string', async (req, res, next) => {

    const { requestId } = req

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), upstreamTimeoutMs)

    try {
        res.status(500).json({requestId})

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


app.use(notFoundMiddleware())
app.use(errorHandler({logger, serviceName}))

app.listen(process.env.PORT, () => {
    logger.info({ port: process.env.PORT }, "service started")
})