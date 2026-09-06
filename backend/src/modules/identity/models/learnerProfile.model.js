import mongoose from "mongoose";

const learnerProfileSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
        unique:true,
        index: true
    },
    interests:[
        {
            type:String,
        }
    ],
    goals:[
        {
            type:String,
        }
    ],
    experienceLevel: {
        type: String,
        enum: [
            'I have no prior knowledge',
            'I have a basic understanding',
            'I am comfortable with the fundamentals',
            'I have substantial experience',
            "I'm not sure"
        ],
        default:null
    },
    studyPreferences:{
        dailyStudyTime: {
            type: String,
            enum: [
                "Less than 1 hour",
                "1-2 hours",
                "2-3 hours",
                "3-4 hours",
                "5 or more hours",
            ],
            default:null
        },

        preferredLearningFormat: {
            type: [String],
            enum: [
                "Reading",
                "Videos",
                "Interactive Learning",
                "Practice Exercises",
                "Projects"
            ],
            default:[]
        }
    },
    onboardingState:{
        type:String,
        required:true,
        enum:['NOT_STARTED','IN_PROGRESS','COMPLETED'],
        default:'NOT_STARTED'
    }

},{timestamps:true})


export const LearnerProfile = mongoose.model('LearnerProfile',learnerProfileSchema)

