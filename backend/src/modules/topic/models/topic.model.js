import mongoose from 'mongoose'

const topicSchema =  new mongoose.Schema({
    courseId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Course',
        required:true,
        index:true
    },
    title:{
        type:String,
        required:true,
        trim:true,
        minlength:4,
        maxlength:100
    },
    description:{
        type:String,
        trim:true,
        maxlength:500,
        default:""
    },
    learningObjectives:{
        type: [String],
        required: true,
        default:[]
    },
    order:{
        type: Number,
        required:true,
        min:1
    }
},{timestamps:true})

topicSchema.index(
    { courseId: 1, order: 1 },
    { unique: true }
);

export const Topic = mongoose.model('Topic',topicSchema)