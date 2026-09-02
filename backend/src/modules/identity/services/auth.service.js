import { ReceiptPoundSterling } from "lucide-react";
import { ApiError } from "../../../shared/errors/ApiError.js"
import { uploadOnCloudinary } from "../../../shared/utils/cloudinary.js"
import { hashToken } from "../../../shared/utils/hashToken.js";
import { RefreshSession } from "../models/refreshSession.model.js"
import { User } from "../models/user.model.js"
import { randomUUID } from "crypto";
import jwt from 'jsonwebtoken'

const signupService = async({name,email,password,avatarLocalPath})=>{
    const existedUser = await User.findOne({
       email
    })

    if(existedUser){
        throw new ApiError(400,'EMAIL_ALREADY_EXIST','Email already registered')
    }

    // if(!avatarLocalPath) throw new ApiError(400,'VALIDATION_ERROR','Avatar file is required')

    const uploadAvatar = await uploadOnCloudinary(avatarLocalPath)

    if(avatarLocalPath && !uploadAvatar?.secure_url) throw new ApiError(400,'CLOUDINARY_ERROR','Something went wrong while uploading the avatar file on cloudinary')
    
    const user = await User.create({
        name:name,
        email:email,
        password:password,
        avatar: (uploadAvatar !== null) ? uploadAvatar.secure_url : null  
        // uploadAvatar?.secure_url ?? null these is nullish coalescing operator which means if the secure url is null or undefined then use null otherwise use the secure url.
    })
    
    const createdUser = user.toObject()
    delete createdUser.password

    return createdUser
}

const loginService = async({email,password})=>{
    const existedUser = await User.findOne({
       email
    })

    if(!existedUser){
        throw new ApiError(400,'USER_NOT_FOUND','User not exist, Signup instead')
    }

    // if user exist then verify the password
    const isPasswordValid = await existedUser.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(400,'INCORRECT_PASSWORD',"Incorrect Password")
    }

    // check the account status and if it is asctive then only generate the access or refresh token
    if(existedUser.status !== "ACTIVE"){
        throw new ApiError(422,'ACCOUNT_NOT_ACTIVE',"The account is not active any more")
    }

    const jti = randomUUID()

    const accessToken = existedUser.generateAccessToken()
    const refreshToken = existedUser.generateRefreshToken(jti)

    if(!accessToken || !refreshToken){
        throw new ApiError(400,'TOKEN_NOT_FOUND','Something went wrong while generating tokens')
    }

    // create refresh session
    const tokenHash = hashToken(refreshToken)

    const sessionExpiresAt = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
    );
    
    const refreshSession = await RefreshSession.create({
        userId:existedUser._id,
        jti,
        tokenHash,
        expiresAt:sessionExpiresAt,
        tokenFamily: randomUUID()
    })
    
    if(!refreshSession){
        throw new ApiError(400,'REFRESH_SESSION_ISSUE',"Something went wrong while creating refresh session")
    }

    const loggedUser = existedUser.toObject()
    delete loggedUser.password

    return {loggedUser,accessToken,refreshToken}
}

const refreshService = async(incomingRefreshToken)=>{
    // if there is no token then user is unauthenticated
    if(!incomingRefreshToken){
        throw new ApiError(422,'UNAUTHENTICATED_ACCESS','User is not authenticated')
    }

    // if user have the token then check wether it is correct jwt token or not, to handle our own error we use try and catch
    let verifyToken

    try {
        verifyToken = jwt.verify(
            incomingRefreshToken,
            process.env.JWT_REFRESH_SECRET
        )
    } catch (error) {
        throw new ApiError(
            401,
            "INVALID_REFRESH_TOKEN",
            "Refresh token is invalid or expired"
        )
    }

    // extract the sub and jti from it.
    const userId = verifyToken.sub
    const oldJti = verifyToken.jti

    // find the particular refresh session from the user id
    const refreshSession = await RefreshSession.findOne({
        userId,
        jti:oldJti
    })

    if(!refreshSession){
        throw new ApiError(401,'INVALID_SESSION','Refresh session is invalid or no longer available')
    }

    // verify expiry also if session is expired or not
    if(refreshSession.expiresAt <= Date.now() || refreshSession.revokedAt !== null){
        throw new ApiError(401,'INVALID_SESSION','Session is expired or revoked')
    }

    // now hash the jwt token for comparision
    const tokenHashed = hashToken(incomingRefreshToken)

    if(tokenHashed !== refreshSession.tokenHash){
        throw new ApiError(400,'INVALID_TOKEN','Token is already revoked')
    }

    // now generate new access and refresh token
    const user = await User.findById(userId)
    if (!user) {
        throw new ApiError(
            401,
            "USER_NOT_FOUND",
            "User no longer exists"
        )
    }

    if (user.status !== "ACTIVE") {
        throw new ApiError(
            401,
            "ACCOUNT_NOT_ACTIVE",
            "The account is not active"
        )
    }

    const newJti = randomUUID()
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken(newJti)

    const newHashedToken = hashToken(refreshToken)

    // update the refresh session
    refreshSession.jti = newJti
    refreshSession.tokenHash = newHashedToken
    await refreshSession.save({validateBeforeSave:false})

    return {accessToken,refreshToken}
}

const logoutService = async (incomingRefreshToken) => {

    if (!incomingRefreshToken) {
        return;
    }

    let verifyToken;

    try {
        verifyToken = jwt.verify(
            incomingRefreshToken,
            process.env.JWT_REFRESH_SECRET
        );
    } catch (error) {
        return;
    }

    const userId = verifyToken.sub;
    const jti = verifyToken.jti;

    const refreshSession = await RefreshSession.findOne({
        userId,
        jti
    });

    if (refreshSession) {
        refreshSession.revokedAt = new Date();
        await refreshSession.save();
    }

    return
};


export {
    signupService,
    loginService,
    refreshService,
    logoutService
}