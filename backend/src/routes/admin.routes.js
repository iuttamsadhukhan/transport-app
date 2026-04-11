// ============================================================
// admin.routes.js — Handles all Admin Panel URLs
// Admin is the super user who controls everything
// This file will handle :
//   - View all uploaded documents from all users
//   - Edit or delete any document entry
//   - Download document photos
//   - Manage users (add, block, assign document permissions)
//   - Generate reports (by date, by user, by document type)
//   - View dashboard statistics
// All URLs in this file start with /api/admin/
// because in app.js we wrote : app.use('/api/admin', ...)
// Only admin users will be allowed to access these routes
// We will add admin verification middleware later
// ============================================================

// express is our web framework
// Router() creates a mini-app that handles its own routes
const express = require('express');
const router = express.Router();

// ============================================================
// TEST ROUTE
// Temporary route to confirm this file is connected
// Method : GET
// Full URL : http://localhost:5000/api/admin/test
// ============================================================
router.get('/test', (req, res) => {
  // Send a simple JSON response to confirm route is working
  res.json({ message: 'Admin route working' });
});

// ============================================================
// EXPORT THE ROUTER
// Makes this router available when required in app.js
// ============================================================
module.exports = router;