import { createLogger } from '@acme/observability'
import config from './config/env.js'
import { createApp } from './app.js'

const { port, authUrl, upstreamTimeoutMs, nodeEnv, version, serviceName } = config

const logger = createLogger({ serviceName, nodeEnv, version })

const app = createApp({ config, logger })

app.listen(port, () => logger.info("service name: ", serviceName))