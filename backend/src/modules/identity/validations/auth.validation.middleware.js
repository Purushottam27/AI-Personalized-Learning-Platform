import { loginSchema, signupSchema } from "./auth.validation.js";

const validateSignup = (req,res,next)=>{
    const result = signupSchema.safeParse(req.body);

    if(!result.success){
        return next(result.error)
    }

    req.body = result.data
    next()
}

const validateLogin = (req,res,next)=>{
    const result = loginSchema.safeParse(req.body);

    if(!result.success){
        return next(result.error)
    }

    req.body = result.data
    next()
}

export {
    validateSignup,
    validateLogin
}