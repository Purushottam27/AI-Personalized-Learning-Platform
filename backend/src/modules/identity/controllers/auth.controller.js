import { ApiResponse } from "../../../shared/responses/ApiResponse.js"
import { loginService, logoutService, refreshService, signupService } from "../services/auth.service.js"

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
    const incomingRefreshToken = req.cookies?.refreshToken

    const {accessToken,refreshToken} = await refreshService(incomingRefreshToken)

    const options = {
        httpOnly : true,
        secure: process.env.NODE_ENV === 'production',
        sameSite:'strict'
    }

    return res.status(200)
    .cookie('accessToken',accessToken,options).cookie('refreshToken',refreshToken,options)
    .json(
        new ApiResponse({accessToken,refreshToken},'Refresh and Access token created successfully')
    )
}

const logoutUser = async(req,res)=>{
    const incomingRefreshToken = req.cookies?.refreshToken

    await logoutService(incomingRefreshToken)

    const options = {
        httpOnly:true,
        secure: process.env.NODE_ENV === 'production',
        sameSite:'strict'
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(null,"User Log Out successfully")
    )
}

const currentUser = async(req,res)=>{
    return res.status(200).json(
        new ApiResponse({user:req.user},"Current user fetched successfully")
    )
}

export {
    registerUser,
    loginUser,
    refresh,
    logoutUser,
    currentUser
}