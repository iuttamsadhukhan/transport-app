// ============================================================
// auth.routes.js — Handles all Authentication related URLs
// Authentication means : Who are you? Prove it.
// This file will handle :
//   - User login with mobile number
//   - OTP (One Time Password) sending via SMS
//   - OTP verification and JWT token generation
//   - User logout
// All URLs in this file start with /api/auth/
// because in app.js we wrote : app.use('/api/auth', ...)
// ============================================================

// express is our web framework
// Router() creates a mini-app that handles its own routes
// We use Router so each feature has its own separate file
// instead of putting everything in one big app.js file
const express = require('express');
const router = express.Router();

// ============================================================
// TEST ROUTE
// This is a temporary route just to confirm this file
// is properly connected to app.js
// Method : GET (just fetching/reading data, not sending)
// Full URL : http://localhost:5000/api/auth/test
// /api/auth comes from app.js, /test comes from here
// ============================================================
router.get('/test', (req, res) => {
  // req = request object : contains data sent BY the client
  // res = response object : used to send data BACK to client
  // res.json() sends a JSON response back to the browser
  res.json({ message: 'Auth route working' });
});

// ============================================================
// EXPORT THE ROUTER
// module.exports makes this router available to other files
// In app.js we do require('./routes/auth.routes')
// That require() call gets this exported router object
// ============================================================
module.exports = router;