import mongoose from 'mongoose'

const enrollmentSchema = new mongoose.Schema({
    learnerId : {
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
        index: true
    },
    courseId : {
        type:mongoose.Schema.Types.ObjectId,
        ref:'Course',
        required:true,
        index: true
    },
    status:{
        type:String,
        enum:['ACTIVE','COMPLETED','WITHDRAWN'],
        default: "ACTIVE",
        required:true
    },
    enrolledAt:{
        type:Date,
        required: true,
        default: Date.now
    },
    withdrawnAt:{
        type:Date,
        default: null
    },
    completedAt:{
        type:Date,
        default: null
    }


},{timestamps:true})

// Database-level invariant: at most one active enrollment per learner/course.
// WITHDRAWN/COMPLETED history remains available, so re-enrollment after withdrawal is allowed.
enrollmentSchema.index(
    { learnerId: 1, courseId: 1, status: 1 },
    {
        unique: true,
        name: "uniq_active_enrollment_per_learner_course",
        partialFilterExpression: { status: "ACTIVE" },
    }
);

export const Enrollment = mongoose.model('Enrollment',enrollmentSchema)