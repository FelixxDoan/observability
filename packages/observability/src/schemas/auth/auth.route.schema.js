import { z } from 'zod'
import { loginBodySchema, registerBodySchema } from './auth.body.schema.js';

export const loginRouteSchema = z.object({
    body: loginBodySchema,
    query: z.object({}).optional(),
    params: z.object({}).optional()
})

export const registerRouteSchema = z.object({
    body: registerBodySchema,
    query: z.object({}).optional(),
    params: z.object({}).optional()
})