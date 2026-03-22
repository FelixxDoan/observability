import { consume } from "../store/record.js"

export const createRateLimitMiddleware = (policy) => {

  const { limiterName, scope, store, max, windowMs, keyResolver } = policy

  if (typeof (limiterName) !== "string" || limiterName.trim() === "") {
    throw Error("Missing propertise policy")
  }

  if (!keyResolver || typeof (keyResolver) !== 'function') {
    throw Error("Missing propertise policy")
  }

  return (req, res, next) => {
    const identityValue = keyResolver(req)

    if (typeof (identityValue) !== "string" || identityValue.trim() === "") {
      const e = new Error("Invalid rate limit identity")
      e.statusCode = 500
      return next(e)
    }

    const finalKey = store.buildKey(limiterName, identityValue)

    const pass = consume(store, finalKey, max, windowMs, Date.now())

    if (!pass) {
      const e = new Error("Rate limit")
      e.statusCode = 429
      e.code = "RATE_LIMITED"
      if(scope === "account") e.policy = { limiterName, scope, accountKey: req.valdated.body.username }
      e.policy = { limiterName, scope }
      return next(e)
    }

    return next()
  }

}