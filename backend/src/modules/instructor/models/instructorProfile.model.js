import mongoose from "mongoose";

const instructorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    professionalTitle: {
      type: String,
      trim: true,
      default: null
    },
    expertiseAreas: [
      {
        type: String,
      },
    ],
    bio: {
      type: String,
      trim:true,
      default:null
    },
    experienceYears:{
      type: Number,
      min:0,
      default:null
    },
    organization:{
      type: String,
      trim: true,
      default:null
    },
    socialLinks:{
      type: Map,
      of: String,
      default: {}
    },
    onboardingState:{
        type:String,
        required:true,
        enum:['NOT_STARTED','IN_PROGRESS','COMPLETED'],
        default:'NOT_STARTED'
    }
  },
  { timestamps: true },
);

export const InstructorProfile = mongoose.model(
  "InstructorProfile",
  instructorProfileSchema,
);
