export const createSpecificValidation = (details) => {

    const { formErrors, fieldErrors } = details

    if (formErrors.length !== 0) return { hasFormErrors: true }

    const fieldPaths = Object.keys(fieldErrors)

    const invalidFieldCount = fieldPaths.length
    let validationTargets = []

    for (let field of fieldPaths) {
        let target = field.split('.')[0]

        if (validationTargets.length < 1) {
            validationTargets.push(target)
            continue
        }

        if (!validationTargets.includes(target)) {
            validationTargets.push(target)
        }

    }

    return { invalidFieldCount, validationTargets }
}

export const createSpecificRateLimit = (policy, ip) => {
    const { limiterName, scope } = policy

    const clientIp = ip

    if (scope === "account") {
        const { accountKey } = policy
        return { limiterName, scope, clientIp, accountKey }
    }
    return { limiterName, scope, clientIp }
}