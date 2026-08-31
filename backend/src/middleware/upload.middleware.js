import multer from 'multer'

// code taken from the multer documentation
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./storage");
    },

    filename: function (req, file, cb) {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;

        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

const upload = multer(
    { 
        storage,
        // limits: {
        //     fileSize: 10*1024*1024 // 10 MB
        // }
        // multer also gives as the option to include the file filter function from which we can restrict the uploades of specific file formate.
    }
)

export default upload;
 