
const genError = (status, msg) => {
    const e = new Error(msg)
    e.statusCode = status
    return e
}

export const handleErrorRespones = async (result, next) => {
    const fallback = () => next(genError(result.status, "Upstream service returned an invalid error response"))

    const contentType = result.headers.get("content-type")
    if (!contentType) return fallback()

    if (!contentType.includes('json')) return fallback()

    try {
        const body = await result.json()

        if (typeof (body) !== 'object' || body === null) return fallback()

        if (typeof (body.error) !== 'object' || body.error === null) return fallback()

        if (typeof (body.error.message) !== "string" || typeof (body.error.code) !== 'string') return fallback()

        const e = new Error(body.error.message)
        e.statusCode = result.status
        e.code = body.error.code
        return next(e)
    } catch (error) {
        return fallback()
    }
}

export const handleSuccessResponse = async (result, res) => {
    if (result.status === 204) {
        return res.status(204).end()
    }

    const contentType = result.headers.get("content-type")
    if (contentType?.includes("json")) {
        const data = await result.json()

        return res.status(result.status).json(data)
    } else {
        const data = await result.text()
        if (data) {
            return res.status(result.status).send(data)
        }
        return res.status(result.status).end()
    }
}   