class ApiError extends Error {
    constructor(statusCode, code, message = "Something went wrong", details = null) {
        super(message);

        this.statusCode = statusCode;
        this.code = code;
        this.message = message;
        this.details = details;

        Error.captureStackTrace(this, this.constructor);
    }
}

export { ApiError };

// use case:
/*
if(!name){
    throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "All fields are required",
        {
            name: "required",
            email: "required",
            password: "required"
        }
    );
}
*/