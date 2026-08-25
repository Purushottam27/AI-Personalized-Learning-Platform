import mongoose from "mongoose";

const studentProfileSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
        unique:true
    },
    interests:[
        {
            type:String,
            required:true
        }
    ],
    goals:[
        {
            type:String,
            required:true
        }
    ],
    experienceLevel:{
        type:String,
        enum:['BEGINNER','INTERMEDIATE','ADVANCED'],
        default:'BEGINNER',
        required:true
    },
    studyPreferences:{
        dailyStudyTime: {
            type: String,
            enum: [
                "<1_HOUR",
                "1-2_HOURS",
                "2-3_HOURS",
                "3-4_HOURS",
                "5+_HOURS"
            ],
            required:true
        },

        preferredLearningFormat: {
            type: [String],
            enum: [
                "READING",
                "VIDEO",
                "INTERACTIVE",
                "PRACTICE",
                "PROJECTS"
            ],
            required:true
        }
    },
    onboardingState:{
        type:Boolean,
        required:true,
        default:false
    }

},{timestamps:true})


export const StudentProfile = mongoose.model('StudentProfile',studentProfileSchema)

// userId: ObjectId("U1"),
//     interests: [...],
//     goals: [...],
//     experienceLevel: "...",
//     studyPreferences: {...},
//     onboardingState: "..."

// {
//   "_id": "68a9f1c2e4b7a12345678901",
//   "userId": "68a9e8d4e4b7a12345678890",
//   "interests": [
//     "Web Development",
//     "Artificial Intelligence",
//     "Data Science",
//     "Mathematics"
//   ],
//   "goals": [
//     "Become a Full Stack Developer",
//     "Improve JavaScript skills",
//     "Build AI-based projects",
//     "Get an internship"
//   ],
//   "experienceLevel": "Intermediate",
//   "studyPreferences": {
//     "preferredLearningStyle": "Interactive",
//     "preferredContentTypes": [
//       "Videos",
//       "Practical Projects",
//       "Quizzes"
//     ],
//     "dailyStudyTime": 2,
//     "preferredDifficulty": "Adaptive"
//   },
//   "onboardingState": {
//     "isCompleted": true,
//     "currentStep": 5
//   },
//   "createdAt": "2026-08-20T10:30:00.000Z",
//   "updatedAt": "2026-08-24T15:45:00.000Z"
// }



// ○ I'm completely new to these subjects
// ○ I know some basics
// ○ I'm comfortable with the fundamentals
// ○ I have substantial experience
// ○ I'm not sure