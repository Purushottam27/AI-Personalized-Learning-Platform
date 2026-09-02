import { ApiResponse } from "../../../shared/responses/ApiResponse.js"
import { loginService, signupService } from "../services/auth.service.js"

const registerUser = async(req,res)=>{
    const {name,email,password} = req.body
    const avatarLocalPath = req.file?.path

    const user = await signupService({
        name,
        email,
        password,
        avatarLocalPath
    })

    return res.status(201).json(
        new ApiResponse(user,'User created successfully')
    )
}

const loginUser = async(req,res)=>{
    const {email,password} = req.body

    const {loggedUser,accessToken,refreshToken} = await loginService({
        email,
        password
    })
    
    const options = {
        httpOnly : true,
        secure: process.env.NODE_ENV === 'production',
        sameSite:'strict'
    }

    return res.status(200)
    .cookie('accessToken',accessToken,options).cookie('refreshToken',refreshToken,options)
    .json(
        new ApiResponse({loggedUser,accessToken,refreshToken},'User logged in successfully')
    )
}

const refresh = async(req,res)=>{
    
}

export {
    registerUser,
    loginUser
}