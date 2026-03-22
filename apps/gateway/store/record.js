export const createRateLimitStore = () => {
    const stores = new Map()

    const buildKey = (limiterName, identityValue) => `${limiterName}:${identityValue}`

    const set = (key, record) => stores.set(key, record)

    const get = (key) => stores.get(key)

    const remove = (key) => stores.delete(key)

    const clear = () => stores.clear()

    const store = {
        buildKey,
        set,
        get,
        remove,
        clear
    }

    return store
}

export const consume = (store, finalKey, max, windowMs, now) => {
    let record = store.get(finalKey)

    if(!record) {
        const count = 1
        const resetAt = windowMs + now
        record = {count, resetAt}

        store.set(finalKey, record)
        return true
    }

    if(record.resetAt <= now) {
        const count = 1
        const resetAt = windowMs + now
        record = {count, resetAt}

        store.set(finalKey, record)

        return true
    }

    record.count +=1

    if(record.count > max) {
        return false
    }
    
    return true
}