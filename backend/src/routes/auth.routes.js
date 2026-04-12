// ============================================================
// auth.routes.js — Authentication URL Routes
// Defines which URL calls which controller function
// All routes here start with /api/auth/
// because in app.js we wrote :
//   app.use('/api/auth', require('./routes/auth.routes'))
// ============================================================

// express Router creates a mini router for auth routes
const express = require('express');
const router = express.Router();

// Import controller functions
// These functions contain the actual business logic
const { sendOTP, verifyOTP, getMe } = require('../controllers/auth.controller');

// Import protect middleware
// Used on routes that require user to be logged in
const { protect } = require('../middleware/auth.middleware');

// ============================================================
// ROUTE 1 : Send OTP
// Method : POST — sending data to server
// URL    : POST /api/auth/send-otp
// Access : Public — no login required
// Body   : { mobile: "9876543210" }
// Action : Generates OTP and sends to mobile number
// ============================================================
router.post('/send-otp', sendOTP);

// ============================================================
// ROUTE 2 : Verify OTP
// Method : POST — sending data to server
// URL    : POST /api/auth/verify-otp
// Access : Public — no login required
// Body   : { mobile: "9876543210", otp: "847392" }
// Action : Verifies OTP and returns JWT token on success
// ============================================================
router.post('/verify-otp', verifyOTP);

// ============================================================
// ROUTE 3 : Get Current User
// Method : GET — fetching data from server
// URL    : GET /api/auth/me
// Access : Private — login required (protect middleware)
// Header : Authorization: Bearer <token>
// Action : Returns logged in user details
// ============================================================
router.get('/me', protect, getMe);

// ============================================================
// EXPORT ROUTER
// Makes routes available to app.js
// ============================================================
module.exports = router;