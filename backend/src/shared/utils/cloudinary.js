import fs from 'fs'
import cloudinary from '../../config/cloudinary.js';

const uploadOnCloudinary = async function(localFilePath){
    try {
        if(!localFilePath) return null

        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type:'auto'
        })

        console.log("File is uploaded on cloudinary ",response.url,response.secure_url); // form reponse we get the public url which we can give to user to access the images.

        await fs.promises.unlink(localFilePath); // make it asynchronous
        
        return response
    } catch (error) {
        console.log("Cloudinary Error:"); 
        console.log(error);

        if (localFilePath && fs.existsSync(localFilePath)) {
            await fs.promises.unlink(localFilePath);
        }

        throw error;  
    }
}

export {uploadOnCloudinary}