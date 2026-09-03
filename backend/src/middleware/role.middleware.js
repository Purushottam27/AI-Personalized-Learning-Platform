import { ApiError } from "../shared/errors/ApiError.js";

const roleMiddleware = (...roles)=>{
    return (req, res, next) => {
        if (!roles.includes(req.user?.role)) {
            throw new ApiError(403,'UNAUTHORIZED_ACCESS','User is unauthroized')
        }
    next();
  };
}

export {roleMiddleware}