// ============================================================
// cloudinary.js --- Cloudinary Cloud Storage Configuration
// FILE LOCATION : backend/src/config/cloudinary.js
// ============================================================
// WHAT IS CLOUDINARY?
// Cloudinary is a free cloud service that stores photos/files
// When user uploads a document photo from mobile :
// Step 1 : Photo travels from mobile to our backend server
// Step 2 : Our backend sends photo to Cloudinary cloud
// Step 3 : Cloudinary stores it and gives back a web URL
// Step 4 : We save that URL in PostgreSQL database
// Step 5 : Anyone with that URL can view the photo anytime
// Free plan gives 25GB storage --- enough for thousands of docs
// ============================================================

// cloudinary is the official npm package for Cloudinary service
// We installed it earlier with : npm install cloudinary
// .v2 means we use version 2 of their API (latest stable)
const cloudinary = require('cloudinary').v2;

// dotenv loads secret values from our .env file
// into process.env so we can use them safely in code
const dotenv = require('dotenv');

// Actually trigger the loading of .env file
// Must call this before using any process.env values
// Without this line all process.env values are undefined
dotenv.config();

// ============================================================
// CONFIGURE CLOUDINARY WITH OUR ACCOUNT CREDENTIALS
// These 3 values uniquely identify our Cloudinary account
// They come from Cloudinary dashboard -> API Keys section
// We store them in .env file --- NEVER hardcode them here
// If hardcoded and pushed to GitHub anyone can use our account
// ============================================================
cloudinary.config({

  // cloud_name : our unique Cloudinary account identifier
  // Found on Cloudinary dashboard top left
  // Example value : iuttamsadhukhan
  // process.env.CLOUDINARY_CLOUD_NAME reads from .env file
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,

  // api_key : long number that identifies our account
  // Found on Cloudinary dashboard -> API Keys section
  // Example value : 847392018364729
  // process.env.CLOUDINARY_API_KEY reads from .env file
  api_key: process.env.CLOUDINARY_API_KEY,

  // api_secret : random string that proves we own the account
  // Found on Cloudinary dashboard -> API Keys section
  // Example value : xK9mP2qR8vL3nT6w
  // KEEP THIS ABSOLUTELY SECRET
  // process.env.CLOUDINARY_API_SECRET reads from .env file
  api_secret: process.env.CLOUDINARY_API_SECRET,

  // secure: true forces all photo URLs to use https://
  // https is encrypted and required for mobile apps
  // Without this photos would use insecure http://
  secure: true

});

// ============================================================
// VERIFY CLOUDINARY CONFIGURATION ON STARTUP
// This runs once when server starts
// Prints confirmation that Cloudinary is configured
// Does NOT test actual connection --- just checks config loaded
// ============================================================
console.log('Cloudinary configured for cloud:', process.env.CLOUDINARY_CLOUD_NAME);

// ============================================================
// EXPORT cloudinary object
// module.exports makes this available to other files
// HOW TO USE IN OTHER FILES :
// const cloudinary = require('../config/cloudinary');
// const result = await cloudinary.uploader.upload(filePath);
// console.log(result.secure_url); // photo URL on Cloudinary
// ============================================================
module.exports = cloudinary;