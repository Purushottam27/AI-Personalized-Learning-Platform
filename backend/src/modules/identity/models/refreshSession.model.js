import mongoose from "mongoose";

const refreshSessionSchema  = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true, // index: true, because refresh operations will frequently need to find sessions belonging to a user.
    },
    jti:{
        type: String,
        required: true,
        unique: true
    },
    tokenHash:{
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true,
        index: true
    },
    revokedAt: {
        type: Date,
        default: null
    },
    tokenFamily: {
        type: String,
        required: true,
        index: true
    }

},{timestamps:true})

export const RefreshSession = mongoose.model('RefreshSession',refreshSessionSchema )