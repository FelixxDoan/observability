import {z} from 'zod'
import { limit, pageNum } from './user.field.schema.js'

export const userQuerySchema = z.object({
    page: pageNum,
    limit
}).strict()