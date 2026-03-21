import { z } from 'zod'
import { emailSchema, nameSchema, passwordSchema, usernameSchema } from './auth.field.schema.js'

export const credentialSchema = z.object({
    username: usernameSchema,
    password: passwordSchema
})
.strict()

export const profileSchema = z.object({
    name: nameSchema,
    email: emailSchema
})  
.strict()

export const loginBodySchema = credentialSchema;

export const registerBodySchema = credentialSchema.merge(profileSchema)
.extend({ confirmPassword: passwordSchema })
.strict()
.refine((data) => data.confirmPassword === data.password, {
    path: ['confirmPassword'],
    message: "Field confirmPassword must match password"
})