import { ApiError } from "../../../shared/errors/ApiError.js"
import { uploadOnCloudinary } from "../../../shared/utils/cloudinary.js"
import { RefreshSession } from "../models/refreshSession.model.js"
import { User } from "../models/user.model.js"
import crypto, { randomUUID } from "crypto";

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
    const tokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

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

export {
    signupService,
    loginService
}