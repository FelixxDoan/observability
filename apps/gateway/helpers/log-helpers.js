export const getEventLogs = (logs, event) =>
  logs.filter((record) => record.event === event)

export const getRequestSummaryLogs = (logs) =>
  logs.filter((record) => record.msg === 'request completed')