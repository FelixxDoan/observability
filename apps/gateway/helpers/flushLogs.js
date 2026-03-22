export const flushLogs = async () => {
    await new Promise((resolve) => setImmediate(resolve))
}