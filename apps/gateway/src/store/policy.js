
import { createRateLimitStore } from "./record.js"
import { resolverPerIp, resolverPerAccount } from './resolver.js';

const store = createRateLimitStore()

export const registerPerIp = {
    limiterName: "register_per_ip",
    scope: "ip",
    max: 5,
    windowMs: 30000,
    keyResolver: resolverPerIp,
    store
}


export const loginPerIp = {
    limiterName: "login_per_ip",
    scope: "ip",
    max: 5,
    windowMs: 30000,
    keyResolver: resolverPerIp,
    store
}

export const loginPerAccount = {
    limiterName: "login_per_account", 
    scope: "account",
    max: 5,
    windowMs: 30000,
    keyResolver: resolverPerAccount,
    store
}