// ============================================================
// app.js — The main entry point of our backend server
// This file starts the Express server and connects all parts
// Order of code matters here — dotenv must load first
// then database then middleware then routes then server start
// ============================================================

// dotenv reads our .env file and loads all secret keys
// into process.env so we can use them anywhere in the code
// MUST be the very first require — before everything else
// so all other files can access process.env values
const dotenv = require('dotenv');

// Load the .env file immediately
// dotenv looks for .env in the folder where npm run dev
// is executed from — which is backend/ folder
// So it correctly finds backend/.env
dotenv.config();

// ============================================================
// DATABASE CONNECTION
// Import db.js which automatically connects to PostgreSQL
// Must be required after dotenv.config() so that
// DB_USER, DB_PASSWORD etc are already loaded into process.env
// when db.js tries to use them for connection
// ============================================================
const db = require('./config/db');

// express is the web framework that handles HTTP requests
// Think of it as the foundation of our backend building
const express = require('express');

// cors = Cross Origin Resource Sharing
// Without this our React frontend on port 3000 cannot talk
// to this backend on port 5000 — browser will block it
const cors = require('cors');

// helmet adds security headers to every response automatically
// It protects against common web attacks like XSS clickjacking
const helmet = require('helmet');

// Create the Express application instance
// app is our server — we attach routes and middleware to it
const app = express();

//
const documentRoutes = require("./routes/document.routes");
//

// ============================================================
// MIDDLEWARE SECTION
// Middleware = functions that run on EVERY request before
// it reaches the route handler
// Think of it as security checkpoints at building entrance
// app.use() registers middleware to run on every request
// ============================================================

// Apply helmet security headers to every single response
app.use(helmet());

// Allow requests only from our frontend URL
// process.env.FRONTEND_URL comes from our .env file
// If not set defaults to localhost:3000 for local development
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));

// Parse incoming JSON data in request body
// Example when frontend sends { mobile: "9876543210" }
// this middleware converts that JSON string into a JS object
// Without this req.body would be undefined
app.use(express.json());

// Parse URL encoded form data from HTML form submissions
// extended true allows nested objects in form data
app.use(express.urlencoded({ extended: true }));

// ============================================================
// ROUTES SECTION
// Routes define what happens when a specific URL is called
// We split routes into separate files to keep code organised
// Each file handles one feature area of the application
// app.use(path, routerFile) connects URL prefix to router
// ============================================================

// All authentication routes — login OTP verify logout
// Example POST /api/auth/login handled in auth.routes.js
app.use('/api/auth', require('./routes/auth.routes'));

// All document routes — upload list view documents
// Example POST /api/documents/upload in document.routes.js
app.use('/api/documents', require('./routes/document.routes'));

// All admin routes — manage users view all docs reports
// Example GET /api/admin/users in admin.routes.js
app.use('/api/admin', require('./routes/admin.routes'));

// ============================================================
// HEALTH CHECK ROUTE
// A simple route to confirm the server is running
// Visit http://localhost:5000 in browser to test
// Returns JSON response so we can see it in browser
// ============================================================
app.get('/', (req, res) => {
    res.json({ message: 'Transport App API is running' });
});

// ============================================================
// START THE SERVER
// process.env.PORT is used when deployed to cloud
// Locally it falls back to port 5000
// app.listen() starts the server and keeps it running
// The callback function runs once server is ready
// ============================================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to test`);
});

// Export app so it can be used in testing later
module.exports = app;