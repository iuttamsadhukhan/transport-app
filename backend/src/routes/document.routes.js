// ============================================================
// document.routes.js --- Document Upload Routes
// FILE LOCATION : backend/src/routes/document.routes.js
// ============================================================
// WHAT THIS FILE DOES :
// Defines all URL routes for document operations
// Currently handles two operations :
// 1. Upload a new document with photos
// 2. Get all documents uploaded by logged in user
// All URLs here start with /api/documents/
// because in app.js we wrote :
// app.use('/api/documents', require('./routes/document.routes'))
// ============================================================

// express is our web framework
// Router() creates a mini router for document related routes
// Keeps document routes separate from auth and admin routes
const express = require('express');
const router = express.Router();
const db = require("../config/db");   // This file usually does NOT have db imported
// protect is our JWT authentication middleware
// It checks if user is logged in before allowing access
// How it works :
// 1. Reads Authorization header from request
// 2. Extracts Bearer token from header
// 3. Verifies token using JWT_SECRET from .env
// 4. If valid --- sets req.user with logged in user details
// 5. If invalid or missing --- returns 401 Unauthorized error
// Any route using protect requires user to be logged in first
const { protect } = require('../middleware/auth.middleware');

// uploadDocument = handles the document upload with photos
// saves to database and Cloudinary cloud storage
// getMyDocuments = returns list of documents for logged in user
const { uploadDocument, getMyDocuments } = require('../controllers/document.controller');

// upload = multer instance from our upload middleware
// Handles receiving photo files from frontend form
// Decodes multipart/form-data requests into req.files array
const { upload } = require('../middleware/upload.middleware');

// ============================================================
// ROUTE 1 : POST /api/documents/upload
// Full URL : http://localhost:5000/api/documents/upload
// Method : POST because we are sending data to server
// Access : Protected --- must be logged in with valid token
// ============================================================
// HOW THE MIDDLEWARE CHAIN WORKS :
// Request arrives at this route
//       ↓
// protect runs first
// Checks JWT token --- if invalid returns 401 immediately
// If valid sets req.user and passes to next middleware
//       ↓
// upload.any() runs second
// WHY upload.any() INSTEAD OF upload.array('photos', 10)?
// upload.array('photos', 10) only accepts field named 'photos'
// If Postman or frontend sends field with any other name
// multer throws "Unexpected field" error and crashes
// upload.any() accepts files with ANY field name
// Much more flexible and forgiving for different clients
// req.files is still populated correctly --- no difference
// We still limit to 10 photos inside the controller
//       ↓
// uploadDocument runs last
// Does the actual work --- validates, uploads, saves to DB
// ============================================================
router.post('/upload',
  // Step 1 : verify JWT token --- reject if not logged in
  protect,
  // Step 2 : receive uploaded files with any field name
  // upload.any() = accept files regardless of field name used
  // Fixes "MulterError: Unexpected field" error completely
  // req.files will be array of all uploaded files
  upload.any(),
  // Step 3 : process the upload --- save to DB and Cloudinary
  uploadDocument
);

// ============================================================
// ROUTE 2 : GET /api/documents/my
// Full URL : http://localhost:5000/api/documents/my
// Method : GET because we are only reading data
// Access : Protected --- must be logged in with valid token
// Returns : list of all documents uploaded by this user
// Useful for showing user their upload history
// ============================================================
router.get('/my',
  // Verify JWT token --- reject if not logged in
  protect,
  // Return all documents for this logged in user
  getMyDocuments
);
//
// =========================
// 📥 GET ALL DOCUMENTS
// =========================
router.get("/", async (req, res) => {
  try {

    const result = await db.query(
      "SELECT * FROM documents ORDER BY id DESC"
    );

    res.json(result.rows);

  } catch (err) {
    console.error("Fetch documents error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

//
// ============================================================
// EXPORT the router
// app.js imports this and mounts it at /api/documents/
// module.exports makes this router available to other files
// ============================================================
module.exports = router;