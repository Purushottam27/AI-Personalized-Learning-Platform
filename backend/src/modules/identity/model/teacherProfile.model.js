// {
//   "_id": "68aa12c5e4b7a12345678950",
//   "userId": "68aa0f91e4b7a12345678941",
//   "professionalTitle": "Senior Mathematics Instructor",
//   "department": "Computer Science and Mathematics",
//   "subjectAreas": [
//     "Mathematics",
//     "Discrete Mathematics",
//     "Data Structures",
//     "Algorithms"
//   ],
//   "bio": "Experienced educator focused on helping students understand mathematical and computer science concepts through practical examples and interactive learning.",
//   "avatar": "https://example.com/avatars/teacher-01.jpg",
//   "createdAt": "2026-08-18T09:15:00.000Z",
//   "updatedAt": "2026-08-23T14:20:00.000Z"
// }

import mongoose from "mongoose";

const teacherProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    professionalTitle: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    subjectAreas: [
      {
        type: String,
        required: true,
      },
    ],
    bio: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export const TeacherProfile = mongoose.model(
  "TeacherProfile",
  teacherProfileSchema,
);
