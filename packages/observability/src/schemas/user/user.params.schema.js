import {z} from 'zod'
import { userIdSchema } from './user.field.schema.js'

export const userParams = z.object({
    userId: userIdSchema
}).strict()