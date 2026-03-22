import { createApp } from '../src/app.js'
import { createLogger } from '@acme/observability'
import { createMemoryLogSink } from './createMemoryLogSink.js'

export const buildTestApp = (extraRoutes) => {
  const sink = createMemoryLogSink()

  const logger = createLogger({
    serviceName: 'gateway',
    nodeEnv: 'test',
    version: '0.1',
    stream: sink.stream,
  })

  const app = createApp({
    config: {
      serviceName: 'gateway',
      nodeEnv: 'test',
      version: '0.1',
      authUrl: 'http://auth.test',
      upstreamTimeoutMs: 500,
    },
    logger,
    extraRoutes,
  })

  return {
    app,
    logs: sink.records,
    resetLogs: sink.reset,
  }
}