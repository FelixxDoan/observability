import { createLogger } from '@acme/observability'
import config from './config/env.js'

const { port, authUrl, upstreamTimeoutMs, nodeEnv, version, serviceName } = config

const logger = createLogger({ serviceName, nodeEnv, version })

const app = createLogger({config, logger})

app.listen(port, () => logger.info("service name: ", serviceName))