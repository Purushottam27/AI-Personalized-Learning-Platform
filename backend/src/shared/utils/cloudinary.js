import fs from 'fs'
import cloudinary from '../../config/cloudinary.js';

const uploadOnCloudinary = async function(localFilePath, uploadOptions = { resource_type: 'auto' }){
    try {
        if(!localFilePath) return null

        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, uploadOptions)

        await fs.promises.unlink(localFilePath); // make it asynchronous
        
        return response
    } catch (error) {
        // Do not log provider URLs, credentials, or uploaded-file details.
        console.error("Cloudinary upload failed");

        if (localFilePath && fs.existsSync(localFilePath)) {
            await fs.promises.unlink(localFilePath);
        }

        throw error;  
    }
}

export {uploadOnCloudinary}