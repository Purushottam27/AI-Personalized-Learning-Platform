import { ApiResponse } from "../../../shared/responses/ApiResponse.js"
import { User } from "../models/user.model.js"
import { loginService, logoutService, passwordService, reactivateService, refreshService, signupService } from "../services/auth.service.js"

const registerUser = async(req,res)=>{
    const {name,email,password,role} = req.body
    const avatarLocalPath = req.file?.path

    const user = await signupService({
        name,
        email,
        password,
        role,
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
    const user = await User.findById(req.user._id)
    .select("_id name email role status avatar emailVerified");

    if (!user) {
        throw new ApiError(
            404,
            "USER_NOT_FOUND",
            "User not found"
        );
    }

    
    return res.status(200).json(
        new ApiResponse(
            user,
            "Current user fetched successfully"
        )
    );
}

const changePassword = async(req,res)=>{
    const {oldPassword,newPassword} = req.body;
    const userId = req.user?._id
    const refreshToken = req.cookies?.refreshToken

    await passwordService(oldPassword,newPassword,userId,refreshToken)

    return res.status(200).json(
        new ApiResponse(null,"Password is changed successfully")
    )
}

const reactivateUser = async(req,res)=>{
    const {email,password} = req.body

    const {reactivatedUser,accessToken,refreshToken} = await reactivateService({
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
        new ApiResponse({reactivatedUser,accessToken,refreshToken},'User account is reactivated')
    )
}

export {
    registerUser,
    loginUser,
    refresh,
    logoutUser,
    currentUser,
    changePassword,
    reactivateUser
}