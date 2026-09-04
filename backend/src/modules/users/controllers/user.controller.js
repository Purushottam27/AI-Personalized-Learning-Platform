import { ApiResponse } from '../../../shared/responses/ApiResponse.js';
import { getUserByIdService, getUsersService, updateUserStatusService, updateCurrentUserService, deactivateCurrentUserService, updateUserAvatarService } from '../services/user.service.js';


const getUsers = async (req, res) => {
    const {data,pagination} = await getUsersService(req.validatedQuery);

    return res.status(200).json(
        new ApiResponse({data,pagination},'Users fetched successfully')
    );
    
};

const getUserById = async(req,res)=>{
    const userId = req.params?.userId

    const {userInfo, profileInfo} = await getUserByIdService(userId)

    return res.status(200).json(
        new ApiResponse({userInfo, profileInfo},'User fetched successfully')
    )
}

const updateUserStatus = async(req,res)=>{
    const userId = req.params?.userId

    const updatedUser = await updateUserStatusService(userId, req.body)

    return res.status(200).json(
        new ApiResponse(updatedUser,'User status updated successfully')
    )
}

const updateCurrentUser = async(req,res)=>{
    const currentUserId = req.user?._id
    const {name} = req.body // as email update has seprate route

    const updatedUser = await updateCurrentUserService(currentUserId, name)

    return res.status(200).json(
        new ApiResponse(updatedUser,'User updated successfully')
    )
}

const updateUserAvatar = async(req,res)=>{
    const currentUserId = req.user?._id
    const avatar = req.file?.path

    const updatedAvatar = await updateUserAvatarService(currentUserId, avatar)

    return res.status(200).json(
        new ApiResponse(updatedAvatar,'User avatar updated successfully')
    )
}

const deactivateCurrentUser = async(req,res)=>{
    const currentUserId = req.user?._id

    await deactivateCurrentUserService(currentUserId)

    return res.status(200).json(
        new ApiResponse(null,'Account deactivated successfully')
    )
}

export {
    getUsers,
    getUserById,
    updateUserStatus,
    updateCurrentUser,
    deactivateCurrentUser,
    updateUserAvatar
}