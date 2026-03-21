const isPresence = (env) => {
    if (env === "" || env === null || typeof (env) === "undefined") {
        throw new Error('invalid env')
    }

    return env
}

const isNumber = (env) => {
    const input = isPresence(env)
    const parseNum = Number(input)

    if (!Number.isInteger(parseNum)) {
        throw new Error("Integer invalid")
    }
    return parseNum
}

const isPort = (num) => {
    const port = isNumber(num)

    if (port < 1 || port > 65535) {
        throw new Error("out of range port")
    }

    return port
}

const isTimeOut = (num) => {
    const timeOut = isNumber(num)

    if (timeOut < 200 || timeOut > 30000) {
        throw new Error("out of range timeout")
    }

    return timeOut
}

const isNode = (env) => {
    const input = isPresence(env)
    const arr = ['development', 'production', 'test']

    const node = arr.filter((a) => a === input)

    if (node.length < 1) {
        throw new Error("Invalid node")
    }

    return node[0]
}

const isUrl = (env) => {
    const input = isPresence(env)
    const url = new URL(input)

    const { protocol } = url
    if (protocol !== 'http:' && protocol !== 'https:') throw new Error('invalid protocol')

    const normalizeUrl = url.toString()

    return normalizeUrl.endsWith('/') ? normalizeUrl.slice(0, -1) : normalizeUrl
}

const checkEnv = () => {
    const initPort = process.env.PORT
    const initAuthURL = process.env.AUTH_URL
    const initTimeout = process.env.UPSTREAM_TIMEOUT_MS
    const initNode = process.env.NODE_ENV
    const initVersion = process.env.VERSION
    const initServiceName = process.env.SERVICE_NAME

    const port = isPort(initPort)
    const authUrl = isUrl(initAuthURL)
    const upstreamTimeoutMs = isTimeOut(initTimeout)
    const nodeEnv = isNode(initNode)
    const version = isPresence(initVersion)
    const serviceName = isPresence(initServiceName)

    return {
        port, authUrl, upstreamTimeoutMs, nodeEnv, version, serviceName
    }
}

const config = checkEnv()

export default config


