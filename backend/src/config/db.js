// ============================================================
// db.js — Database Connection Configuration File
// This file is the bridge between our Node.js backend
// and our PostgreSQL database running on your laptop
// Every time our backend needs data it goes through
// this file to talk to the database
// Think of this file as the telephone operator who
// connects all calls between backend and database
// ============================================================

// pg is the official PostgreSQL client package for Node.js
// We installed it earlier with : npm install pg
// Pool is a connection manager that maintains multiple
// database connections ready to use at any time
// Why Pool and not single connection?
// Single connection = one person on phone at a time
// Pool = telephone exchange with multiple lines open
// When 10 users submit documents simultaneously
// Pool handles all 10 using available connections
// without making anyone wait for a single line to free up
const { Pool } = require('pg');

// dotenv loads our secret values from .env file
// into process.env so we can use them safely
// Without dotenv our database password would be
// written directly in code which is very dangerous
const dotenv = require('dotenv');

// Actually trigger the loading of .env file
// Must be called before using any process.env values
// If this line is missing all process.env values are undefined
dotenv.config();

// ============================================================
// CREATE THE CONNECTION POOL
// We pass all database connection details here
// All sensitive values come from .env file not hardcoded
// The || operator provides a default value if .env value
// is missing which is useful during development
// ============================================================
const pool = new Pool({

    // PostgreSQL username
    // Default username after PostgreSQL installation is postgres
    // process.env.DB_USER reads DB_USER value from .env file
    // || 'postgres' is the fallback if DB_USER is not in .env
    user: process.env.DB_USER || 'postgres',

    // Server address where PostgreSQL is running
    // localhost means PostgreSQL is on your own laptop
    // When we deploy to cloud later this becomes the
    // cloud server address and we just update .env file
    // No code change needed that is the power of .env
    host: process.env.DB_HOST || 'localhost',

    // Name of the specific database to connect to
    // We created transport_app in pgAdmin earlier
    // PostgreSQL can have many databases on same server
    // This line tells it which one to use
    database: process.env.DB_NAME || 'transport_app',

    // Password for the PostgreSQL user
    // This is the password you set when installing PostgreSQL
    // No default value here for security must be in .env file
    password: process.env.DB_PASSWORD,

    // Port number PostgreSQL is listening on
    // 5432 is the default PostgreSQL port
    // Never changes unless you specifically configured it
    port: process.env.DB_PORT || 5432,

    // Maximum number of connections Pool can maintain
    // 10 connections is perfect for development
    // For production with heavy traffic increase to 20 or 50
    max: 10,

    // How long in milliseconds before an idle connection
    // is automatically closed and removed from pool
    // 30000 = 30 seconds
    // Prevents too many unused connections wasting resources
    idleTimeoutMillis: 30000,

    // Maximum time in milliseconds to wait for a connection
    // from the pool before throwing an error
    // 2000 = 2 seconds
    // If database is unreachable we get error in 2 seconds
    // instead of waiting forever
    connectionTimeoutMillis: 2000,
});

// ============================================================
// TEST DATABASE CONNECTION ON STARTUP
// This code runs once automatically when server starts
// It verifies database is reachable before any user
// makes a request
// pool.connect() borrows one connection from the pool
// to test if database is reachable and credentials correct
// ============================================================
pool.connect((err, client, release) => {

    if (err) {
        // Connection failed something is wrong
        // Most common reasons for this error
        // 1. Wrong password in .env file
        // 2. PostgreSQL service is not running
        // 3. Wrong database name in .env file
        // 4. Wrong port number in .env file
        // 5. PostgreSQL not installed correctly
        console.error('================================================');
        console.error('DATABASE CONNECTION FAILED!');
        console.error('Error details : ', err.message);
        console.error('Please check these in your .env file :');
        console.error('  DB_USER  = ', process.env.DB_USER);
        console.error('  DB_HOST  = ', process.env.DB_HOST);
        console.error('  DB_NAME  = ', process.env.DB_NAME);
        console.error('  DB_PORT  = ', process.env.DB_PORT);
        console.error('  DB_PASSWORD is hidden for security');
        console.error('================================================');
        return;
    }

    // release() returns this connection back to the pool
    // VERY IMPORTANT without release() this connection
    // is held forever reducing pool capacity from 10 to 9
    // Always call release() after borrowing a connection
    release();

    // Connection successful confirm in terminal
    // This message appears every time server starts
    console.log('================================================');
    console.log('Database connected successfully!');
    console.log('Connected to : transport_app on localhost:5432');
    console.log('================================================');
});

// ============================================================
// QUERY HELPER FUNCTION
// This function is a shortcut to run SQL queries
// from anywhere in our application
// Instead of importing pool everywhere and calling
// pool.query() we just import db.js and call db.query()
// which is much cleaner and simpler
//
// HOW TO USE IN OTHER FILES
// const db = require('../config/db');
//
// Example 1 Get all users
// const result = await db.query('SELECT * FROM users');
// console.log(result.rows); // array of user objects
//
// Example 2 Get one user by mobile number
// const result = await db.query(
//   'SELECT * FROM users WHERE mobile = $1',
//   ['9876543210']
// );
// console.log(result.rows[0]); // single user object
//
// WHY USE $1 $2 INSTEAD OF VALUES DIRECTLY IN QUERY?
// Wrong and dangerous way with SQL Injection risk
// 'SELECT * FROM users WHERE mobile = ' + mobileNumber
// A hacker types : 9999 OR 1=1
// which returns ALL users — major security breach!
//
// Correct and safe way using Parameterized Query
// 'SELECT * FROM users WHERE mobile = $1', [mobileNumber]
// pg package automatically escapes all special characters
// making SQL injection attacks completely impossible
// ============================================================
const query = (text, params) => {
    // text   = SQL query string with $1 $2 placeholders
    //          Example : 'SELECT * FROM users WHERE id = $1'
    // params = array of actual values for the placeholders
    //          Example : [userId]
    // pg automatically matches $1 to params[0]
    // and $2 to params[1] and so on
    return pool.query(text, params);
};

// ============================================================
// EXPORT BOTH pool AND query
// module.exports makes these available to other files
// when they do : const db = require('../config/db')
//
// pool  = exported for advanced use cases needing
//         transaction control where multiple queries
//         must all succeed together or all fail together
//         Example : transfer money between two accounts
//
// query = exported for all normal database operations
//         this is what we will use 95% of the time
// ============================================================
module.exports = { pool, query };