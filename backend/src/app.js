// ============================================================
// app.js — The main entry point of our backend server
// This file starts the Express server and connects all parts
// ============================================================

// 'express' is the web framework that handles HTTP requests
// Think of it as the foundation of our backend building
const express = require('express');

// 'cors' = Cross Origin Resource Sharing
// Without this, our React frontend (port 3000) cannot talk
// to this backend (port 5000) — browser will block it
const cors = require('cors');

// 'helmet' adds security headers to every response automatically
// It protects against common web attacks like XSS, clickjacking etc.
const helmet = require('helmet');

// 'dotenv' reads our .env file and loads all secret keys
// into process.env so we can use them anywhere in the code
const dotenv = require('dotenv');

// Actually load the .env file — must be called before using any process.env values
dotenv.config();

// Create the Express application instance
// 'app' is our server — we attach routes and middleware to it
const app = express();

// ============================================================
// MIDDLEWARE SECTION
// Middleware = functions that run on EVERY request before
// it reaches the route handler. Think of it as security
// checkpoints at the entrance of a building.
// ============================================================

// Apply helmet security headers to every single response
app.use(helmet());

// Allow requests only from our frontend URL
// process.env.FRONTEND_URL comes from our .env file
// If not set, defaults to localhost:3000 (local development)
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:3000' 
}));

// Parse incoming JSON data in request body
// Example: when frontend sends { mobile: "9876543210" }
// this middleware converts that JSON string into a JS object
app.use(express.json());

// Parse URL-encoded form data (HTML form submissions)
// extended: true allows nested objects in form data
app.use(express.urlencoded({ extended: true }));

// ============================================================
// ROUTES SECTION
// Routes define what happens when a specific URL is called
// We split routes into separate files to keep code organised
// Each file handles one feature area of the application
// ============================================================

// All authentication routes (login, OTP verify, logout)
// Example: POST /api/auth/login will be handled in auth.routes.js
app.use('/api/auth', require('./routes/auth.routes'));

// All document routes (upload photo, list documents, get one)
// Example: POST /api/documents/upload → document.routes.js
app.use('/api/documents', require('./routes/document.routes'));

// All admin routes (manage users, view all docs, reports)
// Example: GET /api/admin/users → admin.routes.js
app.use('/api/admin', require('./routes/admin.routes'));

// ============================================================
// HEALTH CHECK ROUTE
// A simple route to confirm the server is running
// Visit http://localhost:5000 in browser to test
// ============================================================
app.get('/', (req, res) => {
  res.json({ message: 'Transport App API is running' });
});

// ============================================================
// START THE SERVER
// process.env.PORT is used when deployed to cloud (Railway etc.)
// Locally it falls back to port 5000
// ============================================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to test`);
});

// Export app so it can be used in tests later
module.exports = app;