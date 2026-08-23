import mongoose from 'mongoose'

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${process.env.DB_NAME}`)
        console.log("Database connected...", connectionInstance.connection.host)
    } catch (error) {
        console.error("Database connection failed", error)
        throw error;
    }
}

const disconnectDB = async () => {
    try {
        await mongoose.disconnect()
        console.log("Database disconnected...")
    } catch (error) {
        console.error("Database disconnection failed", error)
        throw error;
    }
}

export { connectDB, disconnectDB };