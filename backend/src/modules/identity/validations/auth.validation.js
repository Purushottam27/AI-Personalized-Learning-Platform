import { z } from "zod";

const signupSchema = z.object({
    name:z.string().trim(),
    email:z.string().trim().toLowerCase().email(),
    password:z.string().min(8)
        // .regex(/[A-Z]/, "Password must contain an uppercase letter")
        // .regex(/[a-z]/, "Password must contain a lowercase letter")
        // .regex(/[0-9]/, "Password must contain a number")
        // .regex(/[^A-Za-z0-9]/, "Password must contain a special character"),
})

const loginSchema = z.object({
    email:z.string().trim().toLowerCase().email(),
    password:z.string().min(8)
})

export {
    signupSchema,
    loginSchema
}


