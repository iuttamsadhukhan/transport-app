// ============================================================
// auth.middleware.js — Authentication Middleware
// This middleware runs BEFORE protected route controllers
// It checks if the request has a valid JWT token
// If token is valid — request proceeds to controller
// If token is invalid or missing — request is rejected
// Think of it as a security guard at building entrance
// Every visitor must show valid ID before entering
// ============================================================

// jsonwebtoken is used to verify the JWT token
const jwt = require('jsonwebtoken');

// db is used to check if user still exists and is active
const db = require('../config/db');

// ============================================================
// MIDDLEWARE : protect
// Use this on any route that requires login
// Example in routes file :
//   router.get('/profile', protect, getProfile)
//   protect runs first — if passes then getProfile runs
// ============================================================
const protect = async (req, res, next) => {
    try {
        // --------------------------------------------------------
        // STEP 1 : Get token from request headers
        // Frontend sends token in Authorization header
        // Format : "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6..."
        // We split by space and take the second part
        // --------------------------------------------------------
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            // Split "Bearer tokenvalue" and get tokenvalue
            token = req.headers.authorization.split(' ')[1];
        }

        // If no token found in headers — reject request
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized. Please login first.'
            });
        }

        // --------------------------------------------------------
        // STEP 2 : Verify the token is valid and not expired
        // jwt.verify() checks signature and expiry
        // If invalid or expired it throws an error
        // We catch that error below
        // --------------------------------------------------------
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // decoded now contains : { userId: 123, iat: ..., exp: ... }
        // userId is what we stored when creating the token

        // --------------------------------------------------------
        // STEP 3 : Check if user still exists in database
        // Token might be valid but user could be deleted
        // This extra check ensures user still exists
        // --------------------------------------------------------
        const result = await db.query(
            `SELECT id, name, mobile, is_admin, is_active 
             FROM users 
             WHERE id = $1`,
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User no longer exists. Please login again.'
            });
        }

        const user = result.rows[0];

        // --------------------------------------------------------
        // STEP 4 : Check if user account is still active
        // Admin might have blocked user after they logged in
        // --------------------------------------------------------
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been blocked. Contact admin.'
            });
        }

        // --------------------------------------------------------
        // STEP 5 : Attach user to request object
        // req.user is now available in all controllers
        // that come after this middleware
        // Controllers use req.user.userId to know who is calling
        // --------------------------------------------------------
        req.user = {
            userId: user.id,
            name: user.name,
            mobile: user.mobile,
            isAdmin: user.is_admin
        };

        // --------------------------------------------------------
        // STEP 6 : Call next() to proceed to the controller
        // next() passes control to the next function in chain
        // Without next() the request hangs forever
        // --------------------------------------------------------
        next();

    } catch (error) {
        // JWT verification failed — token is invalid or expired
        console.error('Auth middleware error :', error.message);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token. Please login again.'
        });
    }
};

// ============================================================
// MIDDLEWARE : adminOnly
// Use this on routes that only admins can access
// Always use AFTER protect middleware
// Example :
//   router.get('/users', protect, adminOnly, getAllUsers)
//   protect runs first checks login
//   adminOnly runs second checks admin status
//   getAllUsers runs only if both pass
// ============================================================
const adminOnly = (req, res, next) => {
    // req.user is set by protect middleware above
    // If user is not admin reject the request
    if (!req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin only area.'
        });
    }
    // User is admin — proceed to controller
    next();
};

// ============================================================
// EXPORT BOTH MIDDLEWARE FUNCTIONS
// protect   — for any logged in user
// adminOnly — for admin only routes
// ============================================================
module.exports = { protect, adminOnly };