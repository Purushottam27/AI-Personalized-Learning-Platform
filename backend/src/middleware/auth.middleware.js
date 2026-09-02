import jwt from 'jsonwebtoken'
import { User } from '../modules/identity/models/user.model.js'
import { ApiError } from '../shared/errors/ApiError.js'


const authMiddleware = async(req,res,next) =>{
    // We only want access token and we can get the access token either from the brower or from the header if we get token from header then inside header there is "Authorized" field whose value Bearer <token> but we only want token so we replaced Bearer with ""
    
    const authHeader = req.header("Authorization");

    const accessToken = req.cookies?.accessToken || (authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1] : null);

    if(!accessToken){
        throw new ApiError(401,'UNAUTHENTICATED_ACCESS',"User is not authenticated")
    }

    let decodedToken;

    try {
        decodedToken = jwt.verify(
            accessToken,
            process.env.JWT_ACCESS_SECRET
        );
    } catch (error) {
        throw new ApiError(
            401,
            "INVALID_ACCESS_TOKEN",
            "Invalid or expired access token"
        );
    }

    const user = await User.findById(decodedToken?.sub).select("_id name role status")
    if(!user){
        throw new ApiError(401,"INVALID_ACCESS_TOKEN","Invalid access token")
    }

    if(user.status !== 'ACTIVE'){
        throw new ApiError(422,'ACCOUNT_NOT_ACTIVE',"Account is suspended or deactivated")
    }

    req.user = user
    
    next()
    
}

export {authMiddleware}