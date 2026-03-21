import {z} from 'zod'
import { userQuerySchema } from './user.query.schema.js'
import { userParams } from './user.params.schema.js'

export const userQueryRouteSchema = z.object({
    body: z.object({}).optional(),
    query: userQuerySchema,
    params: z.object({}).optional()
})


export const userParamsRouteSchema = z.object({
    body: z.object({}).optional(),
    query:  z.object({}).optional(),
    params: userParams
})