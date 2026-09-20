import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true,
        trim:true,
        minlength:4,
        maxlength:150
    },
    description:{
        type:String,
        required:true,
        trim:true,
        minlength:20,
        maxlength:5000
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true,
        index:true
    },
    domain:{
        type:String,
        required:true,
        trim:true,
    },
    category:{
        type:String,
        required:true,
        trim:true,
    },
    difficulty:{
        type: String,
        enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
        required: true
    },
    objectives:{
        type: [String],
        required: true,
        default:[]
    },
    estimatedDuration:{
        source:{
            type: String,
            enum: ["MANUAL", "DERIVED"],
        },
        hours:{
            type:Number,
            default:null
        },
        weeks:{
            type:Number,
            default:null
        }
    },
    prerequisites:{
        courses: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Course"
                }
            ],
            default: []
        },

        knowledge: {
            type:[String],
            default:[]
        }
    },
    diagnosticPolicy:{
        enabled:{
            type:Boolean,
            default:false
        },
        passingScore:{
            type:Number ,
            default:null
        },
        questionsPerAttempt: {
            type:Number ,
            default:null
        },
        randomizeQuestions:{
            type:Boolean,
            default:false
        }
    },
    status:{
        type:String,
        required:true,
        enum:['DRAFT','PUBLISHED','ARCHIVED'],
        default:'DRAFT'
    },
    progressionPolicy:{
        lockingEnabled:{
            type:Boolean,
            default:false
        }
    }


},{timestamps:true})

export const Course = mongoose.model('Course',courseSchema)