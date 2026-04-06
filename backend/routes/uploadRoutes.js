const path = require('path');
const express = require('express');
const multer = require('multer');
const router = express.Router();

//Configured where and how the file is saved
const storage = multer.diskStorage({
    destination(req, file, cb) {
        cb(null, 'uploads/'); // Saved files in the 'uploads' folder
    },
    filename(req, file, cb) {
        //Created a unique filename: fieldname-timestamp.extension
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    },
});

//Configured the file filter to ONLY accept images
function checkFileType(file, cb) {
    const filetypes = /jpg|jpeg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb('Images only!'); // Rejects the file if it is not an image
    }
}

//Initialize Multer with the storage and filter rules
const upload = multer({
    storage,
    fileFilter: function (req, file, cb) {
        checkFileType(file, cb);
    },
});

//Create the POST route to handle the upload
router.post('/', upload.single('image'), (req, res) => {
    // Returns the path where the image is stored so the frontend can save it
    res.send(`/${req.file.path}`);
});

module.exports = router;
