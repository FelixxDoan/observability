import {z} from "zod"

export const userIdSchema = z.string().trim().min(1, 'Missing user Id')
export const pageNum = z.coerce.number().int().min(1).default(1)
export const limit = z.coerce.number().int().min(1).max(100).default(10)

