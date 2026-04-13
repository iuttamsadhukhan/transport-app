// ============================================================
// upload.middleware.js --- File Upload Handler Middleware
// FILE LOCATION : backend/src/middleware/upload.middleware.js
// ============================================================
// WHAT DOES THIS FILE DO?
// When a user submits a document with photos this middleware
// handles the entire photo upload process in 2 stages :
//
// STAGE 1 --- multer receives photo from frontend
// multer is a package that reads multipart/form-data requests
// Normal requests send text data (JSON)
// File upload requests send multipart/form-data (binary + text)
// multer decodes this and gives us the file as a buffer in RAM
//
// STAGE 2 --- uploadToCloudinary sends photo to cloud
// Takes the buffer from multer
// Converts it to a stream using streamifier
// Streams it to Cloudinary servers
// Cloudinary stores it and returns a permanent https URL
// We save this URL in our PostgreSQL database
//
// END RESULT : req.file contains the uploaded file info
// We call uploadToCloudinary(req.file.buffer) in controller
// to get back the Cloudinary URL to save in database
// ============================================================

// multer is the npm package for handling file uploads
// We installed it earlier with : npm install multer
// Without multer our Express server cannot receive photo files
// It would just ignore the file part of the request
const multer = require('multer');

// Our cloudinary configuration from cloudinary.js
// This gives us the configured cloudinary object
// ready to upload files to our account
const cloudinary = require('../config/cloudinary');

// streamifier converts a memory buffer into a readable stream
// WHY DO WE NEED THIS?
// multer gives us the file as a Buffer (raw bytes in memory)
// cloudinary.uploader.upload_stream needs a Stream not a Buffer
// streamifier bridges this gap by wrapping the buffer as stream
// We installed it with : npm install streamifier
const streamifier = require('streamifier');

// ============================================================
// MULTER STORAGE CONFIGURATION
// memoryStorage = store uploaded file in RAM as Buffer
// WHY MEMORY STORAGE AND NOT DISK STORAGE?
// memoryStorage : file goes RAM -> Cloudinary -> RAM freed
// diskStorage : file goes RAM -> Hard disk -> Cloudinary -> delete disk file
// memoryStorage is faster and cleaner for cloud uploads
// No temporary files left on server hard disk
// ============================================================
const storage = multer.memoryStorage();

// ============================================================
// FILE TYPE FILTER FUNCTION
// Controls which file types are accepted or rejected
// Called automatically by multer for every file upload attempt
// Parameters :
// req = the HTTP request object
// file = information about the file being uploaded
// cb = callback function to accept or reject the file
// ============================================================
const fileFilter = (req, file, cb) => {

  // file.mimetype = the file type identifier sent by browser
  // Common image mimetypes :
  // image/jpeg = standard JPG photo (most common)
  // image/jpg = alternative JPG identifier
  // image/png = PNG image (lossless quality)
  // image/webp = modern web image format (smaller size)
  // We only allow these 4 image types
  // PDF, Word, Excel, EXE etc. are all rejected for security
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {

    // File type is allowed
    // cb(null, true) = no error, accept this file
    // null = no error
    // true = accept the file
    cb(null, true);

  } else {

    // File type is NOT allowed --- reject it
    // cb(error, false) = send error, reject file
    // new Error(...) = descriptive error message sent to user
    // false = reject the file
    cb(new Error('Only image files allowed. Please upload JPG, PNG or WEBP'), false);

  }

};

// ============================================================
// CREATE MULTER UPLOAD INSTANCE
// Combines storage + fileFilter + size limit into one object
// This object is used as middleware in our route definitions
// ============================================================
const upload = multer({

  // Use memory storage configured above
  storage: storage,

  // Use file type filter configured above
  fileFilter: fileFilter,

  // limits.fileSize = maximum allowed file size per photo
  // 10 * 1024 * 1024 = 10,485,760 bytes = exactly 10 MB
  // 10MB is generous enough for high quality phone photos
  // Prevents huge files from crashing or slowing the server
  // If file exceeds this limit multer auto rejects with error
  limits: { fileSize: 10 * 1024 * 1024 }

});

// ============================================================
// CLOUDINARY UPLOAD HELPER FUNCTION
// This function uploads one photo buffer to Cloudinary
// Returns a Promise that resolves with the photo URL
//
// HOW TO USE IN CONTROLLER :
// const { uploadToCloudinary } = require('../middleware/upload.middleware');
// const photoUrl = await uploadToCloudinary(req.file.buffer);
// // photoUrl is now : https://res.cloudinary.com/iuttamsadhukhan/...
// // Save photoUrl to database
//
// Parameters :
// fileBuffer = raw bytes of the photo file (from multer)
// ============================================================
const uploadToCloudinary = (fileBuffer) => {

  // We return a Promise because Cloudinary upload is async
  // The controller can await this Promise to get the URL
  // resolve(url) = upload succeeded, here is the photo URL
  // reject(error) = upload failed, here is the error
  return new Promise((resolve, reject) => {

    // cloudinary.uploader.upload_stream streams file to cloud
    // First argument = upload options object
    // Second argument = callback function called when done
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        // folder = which folder to store this photo in
        // on Cloudinary all our photos go into this folder
        // Makes it easy to find and manage photos in dashboard
        // Creates the folder automatically if it does not exist
        folder: 'transport-app/documents',

        // resource_type auto = Cloudinary detects file type
        // auto works for images, videos, PDFs etc.
        // Using auto future-proofs the code for other file types
        resource_type: 'auto'

      },
      (error, result) => {

        if (error) {

          // Upload to Cloudinary failed
          // Common reasons : network error, invalid credentials
          // account storage full, Cloudinary service down
          console.error('Cloudinary upload failed:', error.message);
          reject(error);

        } else {

          // Upload succeeded!
          // result.secure_url = permanent https URL of the photo
          // Example : https://res.cloudinary.com/iuttamsadhukhan/
          //           image/upload/v1234567890/
          //           transport-app/documents/abc123.jpg
          // This URL works forever and can be opened in any browser
          console.log('Photo uploaded to Cloudinary:', result.secure_url);
          resolve(result.secure_url);

        }

      }
    );

    // streamifier.createReadStream converts our Buffer to Stream
    // .pipe(uploadStream) feeds the stream into Cloudinary uploader
    // This is the actual moment the photo data travels to cloud
    streamifier.createReadStream(fileBuffer).pipe(uploadStream);

  });

};

// ============================================================
// EXPORT both functions for use in routes and controllers
//
// upload --- used in route files as middleware
// Example in document.routes.js :
// router.post('/upload', upload.array('photos', 10), controller);
// upload.array('photos', 10) = accept up to 10 photos
// 'photos' = the field name used in the frontend form
//
// uploadToCloudinary --- used in controller files
// Example in document.controller.js :
// const url = await uploadToCloudinary(req.files[0].buffer);
// ============================================================
module.exports = { upload, uploadToCloudinary };