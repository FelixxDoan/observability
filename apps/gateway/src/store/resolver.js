
export const resolverPerIp = (req) => {
  return req.ip
}

export const resolverPerAccount = (req) => {
    return req.validated.body.username
} 