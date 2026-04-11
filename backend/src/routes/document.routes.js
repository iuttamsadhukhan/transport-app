// ============================================================
// document.routes.js — Handles all Document Upload URLs
// A document in our app means : Invoice, Challan, PAN card
// photo uploaded by a field user with geotag details
// This file will handle :
//   - Upload a document photo with number, date, geotag
//   - List documents uploaded by the logged-in user
//   - Get details of one specific document
//   - User can only upload types permitted by admin
// All URLs in this file start with /api/documents/
// because in app.js we wrote : app.use('/api/documents', ...)
// ============================================================

// express is our web framework
// Router() creates a mini-app that handles its own routes
const express = require('express');
const router = express.Router();

// ============================================================
// TEST ROUTE
// Temporary route to confirm this file is connected
// Method : GET
// Full URL : http://localhost:5000/api/documents/test
// ============================================================
router.get('/test', (req, res) => {
  // Send a simple JSON response to confirm route is working
  res.json({ message: 'Document route working' });
});

// ============================================================
// EXPORT THE ROUTER
// Makes this router available when required in app.js
// ============================================================
module.exports = router;