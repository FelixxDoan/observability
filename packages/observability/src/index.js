// observability/index.js
import pino from "pino";
import crypto from "crypto";
import pinoHttp from "pino-http";
import client from "prom-client";
import { ZodError } from "zod";
import { createSpecificValidation, createSpecificRateLimit } from "./helper/specificField.js";

export { loginRouteSchema, registerRouteSchema } from './schemas/auth/auth.route.schema.js'

export { userQueryRouteSchema, userParamsRouteSchema } from './schemas/user/user.route.schema.js'

export const createLogger = ({ serviceName, nodeEnv, version }) => {
  if (!serviceName) throw new Error("createLogger: serviceName is required");

  const level = process.env.LOG_LEVEL || "info";

  return pino({
    level,
    base: {
      service: serviceName,
      nodeEnv,
      version,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers.set-cookie",
        "headers.authorization",
        "headers.cookie",
        "headers.set-cookie",
        "authorization",
        "cookie",
        "password",
        "token",
        "refreshToken",
      ],
      censor: "[REDACTED]",
    },
  });
};

export const requestIdMiddleware = () => (req, res, next) => {
  const incoming = req.headers["x-request-id"];
  let requestId = typeof incoming === "string" ? incoming.trim() : "";

  if (!requestId || requestId.length > 128) requestId = crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  next();
};

export const httpLoggerMiddleware = (logger) =>
  pinoHttp({
    logger,
    genReqId: (req) => req.requestId,
    customProps: (req) => ({ requestId: req.requestId }),
    serializers: {
      req(req) {
        return { method: req.method, url: req.url };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
    customLogLevel: (req, res, err) => {
      if (err || res.statusCode >= 400) return "silent";
      return "info";
    },
  });

export const createMetrics = ({ serviceName }) => {
  // default labels
  client.register.setDefaultLabels({ service: serviceName });
  client.collectDefaultMetrics();

  const httpRequestsTotal = new client.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status"],
  });

  const httpRequestDurationMs = new client.Histogram({
    name: "http_request_duration_ms",
    help: "HTTP request duration in milliseconds",
    labelNames: ["method", "route", "status"],
    buckets: [5, 10, 25, 50, 100, 200, 400, 800, 1500, 3000, 8000],
  });

  const normalizeRoute = (req) => {
    // route exists for matched routes
    if (req.route?.path) {
      const base = req.baseUrl || "";
      return `${base}${req.route.path}`;
    }
    // 404 or middleware-only requests
    return "__unknown__";
  };

  const metricsMiddleware = () => (req, res, next) => {
    const start = process.hrtime.bigint();

    res.on("finish", () => {
      const durationMs = Number((process.hrtime.bigint() - start) / 1000000n);
      const method = req.method;
      const status = String(res.statusCode);
      const route = normalizeRoute(req);

      httpRequestsTotal.labels(method, route, status).inc();
      httpRequestDurationMs.labels(method, route, status).observe(durationMs);
    });

    next();
  };

  const metricsHandler = async (req, res) => {
    res.setHeader("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  };

  return { metricsHandler, metricsMiddleware };
};

export const healthzHandler = (req, res) => res.status(200).json({ ok: true });
export const readyzHandler = (req, res) => res.status(200).json({ ready: true });

export const validateMiddleWare = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    })

    req.validated = parsed

    return next()
  } catch (error) {
    if (error instanceof ZodError) {
      const formErrors = []
      const fieldErrors = {}
      for (const issue of error.issues) {
        const { path, message } = issue

        if (path.length === 0) {
          formErrors.push(message)
          continue
        }

        const fullPath = path.join('.')
        if (!fieldErrors[fullPath]) fieldErrors[fullPath] = []
        fieldErrors[fullPath].push(message)
      }

      const e = new Error("Invalid request")
      e.statusCode = 400
      e.details = { formErrors, fieldErrors }
      return next(e);
    }

    return next(error)
  }
}

const expectedRejection = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  429: "RATE_LIMITED",
}

const upstreamFailure = {
  504: "UPSTREAM_TIMEOUT"
}

const policyExpectedRejection = {
  policyName: "expected_rejection",
  level: "warn",
  message: "request rejected"
}

const policyUpstreamFailure = {
  policyName: "upstream_failure",
  level: "warn",
  message: "upstream request failed"
}
const policyUnexpectedServer = {
  policyName: "unexpected_server",
  level: "error",
  message: "unexpected server error"
}


export const notFoundMiddleware = () => (req, res, next) => {
  const error = new Error("Not found")
  error.statusCode = 404
  error.code = "NOT_FOUND"
  return next(error)
}

export const errorHandler = ({logger, serviceName}) => (err, req, res, next) => {
  const { requestId, method, path, ip } = req;
  let status = err.statusCode || err.status

  let errorCode, policy

  const fallback = (currStatus) => {
    if (currStatus !== undefined) status = currStatus
    errorCode = "INTERNAL_ERROR"
    policy = policyUnexpectedServer
  }

  if (typeof (status) !== 'number' || status < 400 || status > 599 || Number.isNaN(status) || !Number.isInteger(status)) {
    fallback(500)
  }

  if (Object.hasOwn(expectedRejection, status)) {

    errorCode = expectedRejection[status]
    policy = policyExpectedRejection

  } else if (Object.hasOwn(upstreamFailure, status)) {

    errorCode = upstreamFailure[status]
    policy = policyUpstreamFailure

  } else {
    fallback()
  }

  const { level, policyName, message } = policy

  const event = `${serviceName}.${policyName}`

  const baseFieldError = { event, requestId, status, errorCode, method, path }

  let specificFields

  let clientPayload = {
    requestId,
    errorCode,
    message
  }

  if (errorCode === "VALIDATION_ERROR") {
    clientPayload.details = err.details
    specificFields = createSpecificValidation(err.details)
  } else if (errorCode === "RATE_LIMITED") {
    specificFields = createSpecificRateLimit(err.policy, ip)
  } else if(errorCode === "INTERNAL_ERROR"){
    specificFields = {
      errorType: err.name,
      errorMessage: err.message,
      errorStack: err.stack,
    }
  } else {
    specificFields = {}
  }

  const logPayload = {...baseFieldError, ... specificFields}

  logger[level](logPayload, message)


  res.status(status).json(clientPayload)
};


