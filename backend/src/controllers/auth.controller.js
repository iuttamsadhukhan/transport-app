// ============================================================
// auth.controller.js — Authentication Logic
// This file handles all authentication operations
// Contains the actual business logic for :
//   1. sendOTP   — generates and sends OTP to mobile
//   2. verifyOTP — verifies OTP and returns JWT token
//   3. getMe     — returns current logged in user details
// Controllers receive request from routes and send response
// They use the database to store and retrieve data
// ============================================================

// db gives us the query function to run SQL on PostgreSQL
const db = require('../config/db');

// jsonwebtoken creates and verifies JWT login tokens
// JWT = JSON Web Token — a secure way to identify logged in users
// When user logs in we give them a token
// They send this token with every future request
// We verify the token to know who they are
const jwt = require('jsonwebtoken');

// otp-generator creates random OTP codes
// We use it to generate 6 digit numeric OTP
const otpGenerator = require('otp-generator');

// ============================================================
// HELPER FUNCTION : generateToken
// Creates a JWT token for a successfully logged in user
// Token contains user ID and is signed with our secret key
// Token expires in 7 days — user stays logged in for 7 days
// After 7 days they need to login again with OTP
// ============================================================
const generateToken = (userId) => {
    // jwt.sign() creates the token
    // First argument  = payload = data stored inside token
    //                   We store userId so we know who this token belongs to
    // Second argument = secret key from .env file
    //                   Anyone with this key can verify the token
    //                   Keep it secret — never share it
    // Third argument  = options
    //                   expiresIn 7d = token expires after 7 days
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
};

// ============================================================
// CONTROLLER 1 : sendOTP
// Called when user enters mobile number and clicks Send OTP
// URL    : POST /api/auth/send-otp
// Input  : { mobile: "9876543210" }
// Output : { success: true, message: "OTP sent successfully" }
// ============================================================
const sendOTP = async (req, res) => {
    try {
        // --------------------------------------------------------
        // STEP 1 : Get mobile number from request body
        // req.body contains data sent by frontend
        // We destructure to get mobile directly
        // --------------------------------------------------------
        const { mobile } = req.body;

        // Validate mobile number is provided
        // If mobile is missing return error immediately
        if (!mobile) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number is required'
            });
        }

        // Validate mobile number format
        // Must be exactly 10 digits for Indian mobile numbers
        // regex pattern checks for exactly 10 digit number
        const mobileRegex = /^[0-9]{10}$/;
        if (!mobileRegex.test(mobile)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10 digit mobile number'
            });
        }

        // --------------------------------------------------------
        // STEP 2 : Check if this mobile exists in users table
        // Only registered users can login
        // Unregistered mobiles are rejected
        // Admin registers users from admin panel
        // --------------------------------------------------------
        const userResult = await db.query(
            `SELECT id, name, mobile, is_admin, is_active, group_id
             FROM users
             WHERE mobile = $1`,
            [mobile]
        );

        // If no user found with this mobile number
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Mobile number not registered. Please contact admin.'
            });
        }

        // Get the user object from query result
        const user = userResult.rows[0];

        // Check if user account is active
        // Admin can block users by setting is_active = false
        if (!user.is_active) {
            return res.status(403).json({
                success: false,
                message: 'Your account is blocked. Please contact admin.'
            });
        }

        // --------------------------------------------------------
        // STEP 3 : Generate 6 digit OTP
        // otp-generator creates a random 6 digit number
        // upperCaseAlphabets false = no capital letters
        // lowerCaseAlphabets false = no small letters
        // specialChars false       = no special characters
        // digits true              = numbers only
        // Result example : 847392
        // --------------------------------------------------------
        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
            digits: true
        });

        // --------------------------------------------------------
        // STEP 4 : Set OTP expiry time to 10 minutes from now
        // new Date() = current time
        // 10 * 60 * 1000 = 10 minutes converted to milliseconds
        // After this time OTP cannot be used even if correct
        // --------------------------------------------------------
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // --------------------------------------------------------
        // STEP 5 : Delete any previous unused OTPs for this mobile
        // A user should have only one active OTP at a time
        // If they request OTP again the old one is deleted first
        // --------------------------------------------------------
        await db.query(
            `DELETE FROM otps WHERE mobile = $1`,
            [mobile]
        );

        // --------------------------------------------------------
        // STEP 6 : Save new OTP to database with expiry time
        // --------------------------------------------------------
        await db.query(
            `INSERT INTO otps (mobile, otp_code, expires_at)
             VALUES ($1, $2, $3)`,
            [mobile, otp, expiresAt]
        );

        // --------------------------------------------------------
        // STEP 7 : Send OTP to mobile via SMS
        // For now we console.log the OTP for testing
        // Later we will integrate Fast2SMS free SMS service
        // In development we can see OTP in terminal output
        // --------------------------------------------------------
        console.log(`OTP for ${mobile} is : ${otp}`);

        // --------------------------------------------------------
        // STEP 8 : Return success response to frontend
        // We do NOT send OTP in response in production
        // In development mode we include OTP for easy testing
        // --------------------------------------------------------
        return res.status(200).json({
            success: true,
            message: 'OTP sent successfully to ' + mobile,
            userName: user.name,
            // In development mode include OTP for testing
            // REMOVE THIS before going live in production
            ...(process.env.NODE_ENV === 'development' && { otp })
        });

    } catch (error) {
        // If any unexpected error occurs log it for debugging
        console.error('sendOTP error :', error);
        return res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
};

// ============================================================
// CONTROLLER 2 : verifyOTP
// Called when user enters OTP and clicks Verify
// URL    : POST /api/auth/verify-otp
// Input  : { mobile: "9876543210", otp: "847392" }
// Output : { success: true, token: "jwt...", user: {...} }
// ============================================================
const verifyOTP = async (req, res) => {
    try {
        // --------------------------------------------------------
        // STEP 1 : Get mobile and OTP from request body
        // --------------------------------------------------------
        const { mobile, otp } = req.body;

        // Validate both fields are provided
        if (!mobile || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Mobile number and OTP are required'
            });
        }

        // --------------------------------------------------------
        // STEP 2 : Find the OTP record in database
        // Find latest unused OTP for this mobile number
        // ORDER BY created_at DESC gets the most recent one
        // LIMIT 1 gets only one record
        // --------------------------------------------------------
        const otpResult = await db.query(
            `SELECT * FROM otps
             WHERE mobile = $1
             AND is_used = false
             ORDER BY created_at DESC
             LIMIT 1`,
            [mobile]
        );

        // If no OTP found for this mobile
        if (otpResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'OTP not found. Please request a new OTP.'
            });
        }

        const otpRecord = otpResult.rows[0];

        // --------------------------------------------------------
        // STEP 3 : Check if OTP has expired
        // Compare current time with stored expiry time
        // --------------------------------------------------------
        if (new Date() > new Date(otpRecord.expires_at)) {
            // Delete expired OTP from database to keep table clean
            await db.query(
                `DELETE FROM otps WHERE id = $1`,
                [otpRecord.id]
            );
            return res.status(400).json({
                success: false,
                message: 'OTP has expired. Please request a new OTP.'
            });
        }

        // --------------------------------------------------------
        // STEP 4 : Check if too many wrong attempts made
        // After 3 wrong attempts block this OTP completely
        // Prevents brute force guessing attacks on OTP
        // --------------------------------------------------------
        if (otpRecord.attempts >= 3) {
            await db.query(
                `DELETE FROM otps WHERE id = $1`,
                [otpRecord.id]
            );
            return res.status(400).json({
                success: false,
                message: 'Too many wrong attempts. Please request a new OTP.'
            });
        }

        // --------------------------------------------------------
        // STEP 5 : Verify OTP entered matches stored OTP
        // --------------------------------------------------------
        if (otpRecord.otp_code !== otp) {
            // Wrong OTP — increment the attempts counter by 1
            await db.query(
                `UPDATE otps
                 SET attempts = attempts + 1
                 WHERE id = $1`,
                [otpRecord.id]
            );
            // Calculate how many attempts are remaining
            const remainingAttempts = 2 - otpRecord.attempts;
            return res.status(400).json({
                success: false,
                message: 'Wrong OTP. ' + remainingAttempts + ' attempts remaining.'
            });
        }

        // --------------------------------------------------------
        // STEP 6 : OTP is correct — mark it as used immediately
        // Used OTP cannot be used again even if still valid
        // This prevents OTP reuse attacks
        // --------------------------------------------------------
        await db.query(
            `UPDATE otps
             SET is_used = true
             WHERE id = $1`,
            [otpRecord.id]
        );

        // --------------------------------------------------------
        // STEP 7 : Get full user details from users table
        // Join with groups table to get group name as well
        // LEFT JOIN means user without group is also returned
        // --------------------------------------------------------
        const userResult = await db.query(
            `SELECT u.id, u.name, u.mobile, u.is_admin,
                    u.is_active, u.group_id, g.name as group_name
             FROM users u
             LEFT JOIN groups g ON u.group_id = g.id
             WHERE u.mobile = $1`,
            [mobile]
        );

        const user = userResult.rows[0];

        // --------------------------------------------------------
        // STEP 8 : Generate JWT token for this logged in user
        // Token identifies user in all future API requests
        // --------------------------------------------------------
        const token = generateToken(user.id);

        // --------------------------------------------------------
        // STEP 9 : Return success response with token and user
        // Frontend stores token and uses it for future requests
        // --------------------------------------------------------
        return res.status(200).json({
            success: true,
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                name: user.name,
                mobile: user.mobile,
                isAdmin: user.is_admin,
                groupId: user.group_id,
                groupName: user.group_name
            }
        });

    } catch (error) {
        console.error('verifyOTP error :', error);
        return res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
};

// ============================================================
// CONTROLLER 3 : getMe
// Returns details of currently logged in user
// Used by frontend to get user info after page refresh
// URL    : GET /api/auth/me
// Input  : JWT token in Authorization header
// Output : { success: true, user: {...} }
// ============================================================
const getMe = async (req, res) => {
    try {
        // req.user is set by auth middleware after token verification
        // auth.middleware.js verifies token and adds user to request
        const userId = req.user.userId;

        // Get fresh user details from database
        // Join with groups to get group name
        const result = await db.query(
            `SELECT u.id, u.name, u.mobile, u.is_admin,
                    u.is_active, u.group_id, g.name as group_name
             FROM users u
             LEFT JOIN groups g ON u.group_id = g.id
             WHERE u.id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = result.rows[0];

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                mobile: user.mobile,
                isAdmin: user.is_admin,
                groupId: user.group_id,
                groupName: user.group_name
            }
        });

    } catch (error) {
        console.error('getMe error :', error);
        return res.status(500).json({
            success: false,
            message: 'Server error. Please try again.'
        });
    }
};

// ============================================================
// EXPORT ALL CONTROLLERS
// Makes these functions available to auth.routes.js
// Routes import these and attach them to URL endpoints
// ============================================================
module.exports = { sendOTP, verifyOTP, getMe };