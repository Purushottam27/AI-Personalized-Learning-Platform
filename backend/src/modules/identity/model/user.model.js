import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true
    },
    passwordHash:{
        type:String,
        required:true,
    },
    role:{
        type:String,
        enum:['STUDENT','TEACHER','ADMIN'],
        default:'STUDENT',
        required:true
    },
    status:{
        type:String,
        enum:['ACTIVE','SUSPENDED','DEACTIVATED'],
        default:'ACTIVE',
        required:true
    },
    avatar:{
        type:String,
        required:true
    }
},{timestamps:true})

export const User = mongoose.model('User',userSchema)



// ACTIVE
//     ↓
// normal authentication/access

// SUSPENDED
//     ↓
// login/access denied

// DEACTIVATED
//     ↓
// login/access denied

 