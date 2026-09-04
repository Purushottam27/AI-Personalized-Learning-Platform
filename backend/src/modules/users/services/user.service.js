import { User } from "../../identity/models/user.model.js";
import { ApiError } from '../../../shared/errors/ApiError.js';
import { StudentProfile } from "../../identity/models/studentProfile.model.js";
import { TeacherProfile } from "../../identity/models/teacherProfile.model.js";
import { RefreshSession } from "../../identity/models/refreshSession.model.js";
import { uploadOnCloudinary } from "../../../shared/utils/cloudinary.js";

// whitelist of safe user fields to return in responses
const SAFE_USER_FIELDS = '_id name email role status avatar suspensionReason suspendedAt createdAt updatedAt';


const getUsersService = async (queryData) => {
    const { page, limit, search, role, status, sort, order } = queryData;

    const match = {
        role: { $ne: 'ADMIN' } // donot show the admin in the users list
    };

    if (search) {
        match.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    if (role) {
        match.role = role;
    }

    if (status) {
        match.status = status;
    }

    const sortOptions = {};
    const allowedSortFields = ['name', 'email', 'createdAt', 'updatedAt', 'role', 'status'];
    
    // Explicitly whitelist sort fields and fallback to createdAt if invalid
    const sortField = sort && allowedSortFields.includes(sort) ? sort : 'createdAt';
    sortOptions[sortField] = order === 'asc' ? 1 : -1; 
    // in these statment we are putting the keys and there val dynamically inside the sortOption object these is how we construct the obj dynamically when we does not know which values are actually we have to put inside it 

    const skip = (page - 1) * limit;

    const [users, totalItems] = await Promise.all([
        User.find(match)
            .select(SAFE_USER_FIELDS)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit)
            .lean(), // lean() is faster for read-only operations
        User.countDocuments(match)
    ]);

    const totalPages = Math.ceil(totalItems / limit);

    return {
        data: users,
        pagination: {
            page,
            limit,
            totalItems,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
        }
    };
};

const getUserByIdService = async (userId) => {
    // first get the user details 
    const user = await User.findById(userId)
        .select(SAFE_USER_FIELDS)
        .lean();

    if (!user) {
        throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // then we have to check that wether user is a student or a teacher as both have different profile data
    let profile = null;

    if (user.role === 'STUDENT') {
        profile = await StudentProfile.findOne({ userId: user._id }).lean();
    } else if (user.role === 'TEACHER') {
        profile = await TeacherProfile.findOne({ userId: user._id }).lean();
    }

    return {
        userInfo : user,
        profileInfo: profile
    };
};

const updateUserStatusService = async (userId, statusData) => {
    const { status, suspensionReason } = statusData; // we get from req.body

    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    // admin cannot change status of deactivated users
    if (user.status === 'DEACTIVATED') {
        throw new ApiError(422, 'STATUS_CHANGE_NOT_ALLOWED', 'Cannot change status of a deactivated account');
    }

    // ACTIVE → SUSPENDED
    if (status === 'SUSPENDED' && user.status === 'ACTIVE') {
        // if (!suspensionReason) {
        //     throw new ApiError(400, 'VALIDATION_ERROR', 'Suspension reason is required when suspending a user');
        // }

        user.status = 'SUSPENDED';
        user.suspensionReason = suspensionReason;
        user.suspendedAt = new Date();

        await user.save();

        // revoke all active refresh sessions for the suspended user
        await RefreshSession.updateMany(
            { userId: user._id, revokedAt: null },
            { revokedAt: new Date() }
        );

    // SUSPENDED → ACTIVE
    } else if (status === 'ACTIVE' && user.status === 'SUSPENDED') {
        user.status = 'ACTIVE';
        user.suspensionReason = null;
        user.suspendedAt = null;

        await user.save();

    } else {
        throw new ApiError(422, 'STATUS_CHANGE_NOT_ALLOWED', `Cannot change status from ${user.status} to ${status}`);
    }

    // return safe user fields
    const updatedUser = await User.findById(userId)
        .select(SAFE_USER_FIELDS)
        .lean();

    return updatedUser;
};

const updateCurrentUserService = async (currentUserId, updatedName) => {
    const updatedUser = await User.findByIdAndUpdate(currentUserId,
        {
            $set:{
                name:updatedName
            }
        },
        {
            new:true,
            runValidators: true
        }
    ).select(SAFE_USER_FIELDS).lean();

    if (!updatedUser) {
        throw new ApiError(404, 'USER_NOT_FOUND','User not found');
    }

    return updatedUser;
};

const updateUserAvatarService = async(currentUserId,avatarLocalPath)=>{
    if(!avatarLocalPath){
        throw new ApiError(400,'AVATAR_NOT_FOUND',"User avatar not found")
    }

    const updatedAvatar = await uploadOnCloudinary(avatarLocalPath)

    if(avatarLocalPath && !updatedAvatar?.secure_url){
        throw new ApiError(400,'CLOUDINARY_ERROR','Something went wrong while uploading the avatar file on cloudinary')
    }

    const avatar = await User.findByIdAndUpdate(currentUserId,
        {
            $set:{
                avatar: updatedAvatar?.secure_url ?? null
            }
        },
        {
            new:true,
            runValidators: true
        }
    ).select('avatar').lean() // as we only need avatar

    if (!avatar) {
        throw new ApiError(404, 'USER_NOT_FOUND','User not found');
    }

    return avatar
}

const deactivateCurrentUserService = async (currentUserId) => {
    const user = await User.findById(currentUserId);

    if (!user) {
        throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    user.status = 'DEACTIVATED';

    await user.save();

    // revoke all active refresh sessions for the deactivated user
    await RefreshSession.updateMany(
        { userId: user._id, revokedAt: null },
        { revokedAt: new Date() }
    );

    return null;
};


export {
    getUsersService,
    getUserByIdService,
    updateUserStatusService,
    updateCurrentUserService,
    deactivateCurrentUserService,
    updateUserAvatarService
}