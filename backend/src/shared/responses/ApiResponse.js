class ApiResponse {
    constructor(data,message='success'){
        this.data = data
        this.message = message
        this.success = true
    }
}

export {ApiResponse}

/*
return res.status(200).json(
    new ApiResponse(user, "user fetched successfully")
)
 */