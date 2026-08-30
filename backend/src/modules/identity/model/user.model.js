import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { randomUUID } from "crypto";
import jwt from 'jsonwebtoken'


const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['STUDENT', 'TEACHER', 'ADMIN'],
        default: 'STUDENT',
        required: true
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'],
        default: 'ACTIVE',
        required: true
    },
    avatar: {
        type: String,
        default: null,
        // required: true
    }
}, { timestamps: true })

export const User = mongoose.model('User', userSchema)


userSchema.pre("save", async function () { // there we have to use normal function not arrow to use this property
  // hook pre is used document ke save hone ke just phele hash kro
  if (!this.isModified("password")) return ; // passwrod change hua tabhi hash kro bar bar ni

  this.password = await bcrypt.hash(this.password, 12);
  
});

userSchema.methods.isPasswordCorrect = async function (password){  // method to check the password
  return await bcrypt.compare(password,this.password) 
}

userSchema.methods.generateAccessToken = function(){ // these is the method we have injected inside the user
  const payload = {
    sub:this._id.toString(),
    role:this.role
  }
  const secret = process.env.JWT_ACCESS_SECRET
  const expiry = process.env.JWT_ACCESS_EXPIRY

  return jwt.sign(payload,secret,{expiresIn:expiry})
}
userSchema.methods.generateRefreshToken = function(){
  const payload = {    // it contain less info as it got refresh and its duration is more than access
    sub:this._id.toString(),
    jti: randomUUID() // 
  }
  const secret = process.env.JWT_REFRESH_SECRET
  const expiry = process.env.JWT_REFRESH_EXPIRY
  
  return jwt.sign(payload,secret,{expiresIn:expiry})
}
