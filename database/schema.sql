-- ============================================================
-- schema.sql — Complete Database Blueprint
-- Transport Company Document Management System
-- PostgreSQL Version 18
-- ============================================================
-- WHAT IS THIS FILE?
-- This file is the master blueprint of your entire database
-- If database is lost or corrupted for any reason
-- Just run this file once in pgAdmin Query Tool
-- and your complete database with all tables and
-- default data will be recreated perfectly
-- Save this file safely — it is as important as .env file
-- ============================================================
-- HOW TO USE THIS FILE?
-- 1. Open pgAdmin
-- 2. Select transport_app database
-- 3. Open Query Tool
-- 4. Open this file or paste contents
-- 5. Press F5 to run
-- All tables and default data will be created fresh
-- ============================================================


-- ============================================================
-- SAFETY FIRST — Drop existing tables before recreating
-- We must drop in reverse order of creation
-- because child tables depend on parent tables
-- Example : documents depends on users and document_types
-- so documents must be dropped before users
-- DROP TABLE IF EXISTS — only drops if table exists
-- avoids error if tables do not exist yet
-- CASCADE — automatically drops any dependent objects
-- like indexes, constraints linked to this table
-- ============================================================
DROP TABLE IF EXISTS document_photos CASCADE;
-- document_photos dropped first because it depends on documents

DROP TABLE IF EXISTS documents CASCADE;
-- documents dropped second because it depends on
-- users, document_types and groups tables

DROP TABLE IF EXISTS user_document_permissions CASCADE;
-- permissions dropped before document_types and users
-- because it links both those tables together

DROP TABLE IF EXISTS document_types CASCADE;
-- document_types dropped before creating fresh

DROP TABLE IF EXISTS users CASCADE;
-- users dropped before groups because users depends on groups

DROP TABLE IF EXISTS groups CASCADE;
-- groups dropped last as it is the top level parent table


-- ============================================================
-- TABLE 1 : groups
-- Master table for all branch offices of the company
-- Every user belongs to one branch group
-- Users can select any group while uploading documents
-- Admin manages this list from admin panel
-- Example data : Head Office, Kolkata Branch, Mumbai Branch
-- ============================================================
CREATE TABLE groups (

    -- Unique ID for each group
    -- SERIAL = PostgreSQL auto generates 1, 2, 3, 4...
    -- No need to manually provide this value during insert
    -- PRIMARY KEY = uniquely identifies each row in this table
    id SERIAL PRIMARY KEY,

    -- Full name of the branch or group
    -- VARCHAR(100) = text field, maximum 100 characters
    -- NOT NULL = this field is mandatory, cannot be empty
    -- Example : 'Kolkata Branch', 'Head Office'
    name VARCHAR(100) NOT NULL,

    -- Short code to identify this group quickly
    -- VARCHAR(20) = text field, maximum 20 characters
    -- NOT NULL = mandatory field
    -- UNIQUE = no two groups can have the same code
    -- Example : 'KOL', 'MUM', 'HO', 'DEL'
    code VARCHAR(20) NOT NULL UNIQUE,

    -- Full address of this branch office
    -- TEXT = unlimited length text field
    -- No NOT NULL here = this field is optional
    address TEXT,

    -- Name of the person in charge at this branch
    -- Optional field — can be left empty
    contact_person VARCHAR(100),

    -- Phone number of this branch office
    -- Optional field — can be left empty
    contact_phone VARCHAR(15),

    -- Is this branch currently active?
    -- BOOLEAN = only TRUE or FALSE values allowed
    -- DEFAULT TRUE = new branches are active by default
    -- Admin can set FALSE to hide branch from dropdowns
    is_active BOOLEAN DEFAULT TRUE,

    -- Exact date and time when this group was created
    -- TIMESTAMP = stores both date and time together
    -- DEFAULT NOW() = automatically saves current date and time
    -- when a new row is inserted — no need to provide manually
    created_at TIMESTAMP DEFAULT NOW(),

    -- Exact date and time when this group was last updated
    -- We will update this programmatically when admin edits
    updated_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 2 : users
-- Stores all users of the system
-- Two types of users :
--   Admin users  : is_admin = TRUE  : full system access
--   Field users  : is_admin = FALSE : can only upload docs
-- Each user belongs to one group (branch)
-- Users login with mobile number and OTP
-- ============================================================
CREATE TABLE users (

    -- Unique ID for each user — auto generated
    id SERIAL PRIMARY KEY,

    -- Full name of the user
    -- Mandatory field — every user must have a name
    name VARCHAR(100) NOT NULL,

    -- Mobile number used for OTP login
    -- Stored as VARCHAR not INTEGER because
    -- mobile numbers can start with 0 and have country codes
    -- UNIQUE = no two users can register with same mobile
    -- NOT NULL = mobile is mandatory for login
    mobile VARCHAR(15) NOT NULL UNIQUE,

    -- Which branch this user belongs to
    -- INTEGER = stores the id number from groups table
    -- REFERENCES groups(id) = value must exist in groups table
    -- This creates a FOREIGN KEY relationship
    -- ON DELETE SET NULL = if the group is deleted
    -- user record stays but group_id becomes NULL
    -- user is not deleted along with the group
    group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,

    -- Is this user an administrator?
    -- TRUE  = admin : can see all data, manage users, reports
    -- FALSE = field user : can only upload permitted documents
    -- DEFAULT FALSE = all new users are field users by default
    -- Admin manually upgrades a user to admin if needed
    is_admin BOOLEAN DEFAULT FALSE,

    -- Is this user account currently active?
    -- TRUE  = user can login normally
    -- FALSE = user is blocked, cannot login
    -- Admin can block/unblock users from admin panel
    is_active BOOLEAN DEFAULT TRUE,

    -- When was this user account created
    created_at TIMESTAMP DEFAULT NOW(),

    -- When was this user account last updated by admin
    updated_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 3 : document_types
-- Master list of document types for transport business
-- These are the 6 types your company uses currently
-- Admin can add more types or deactivate existing ones
-- This list appears as dropdown when user uploads a document
-- ============================================================
CREATE TABLE document_types (

    -- Unique ID for each document type — auto generated
    id SERIAL PRIMARY KEY,

    -- Full name of the document type
    -- This is what user sees in the dropdown list
    -- Example : 'Lorry Challan', 'Manifest', 'POD'
    name VARCHAR(100) NOT NULL,

    -- Short code for this document type
    -- Used internally for reports and filtering
    -- UNIQUE = no two types can have same code
    -- Example : 'LC', 'MAN', 'CON', 'POD', 'KYCS', 'KYCV'
    code VARCHAR(20) NOT NULL UNIQUE,

    -- Explanation of what this document type is
    -- Helps users and admin understand each type
    -- Optional field
    description TEXT,

    -- Is this document type currently available?
    -- TRUE  = appears in user dropdown
    -- FALSE = hidden from users, cannot be selected
    -- Admin can deactivate without deleting
    is_active BOOLEAN DEFAULT TRUE,

    -- When was this document type created
    created_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 4 : user_document_permissions
-- This table controls WHO can upload WHICH document type
-- Admin assigns permissions to each user individually
-- Without permission a user cannot upload that document type
-- Example :
--   Driver Raju    : can upload Lorry Challan and POD only
--   Office Sunita  : can upload KYC Staff and Manifest only
--   Manager Mohan  : can upload all 6 types
-- This is the rights/permissions system you described
-- ============================================================
CREATE TABLE user_document_permissions (

    -- Unique ID for each permission record
    id SERIAL PRIMARY KEY,

    -- Which user has this permission
    -- Must be a valid user id from users table
    -- NOT NULL = every permission must belong to a user
    -- ON DELETE CASCADE = if user is deleted from system
    -- all their permissions are automatically deleted too
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Which document type this user is permitted to upload
    -- Must be a valid id from document_types table
    -- ON DELETE CASCADE = if document type is deleted
    -- all permissions for that type auto delete too
    doc_type_id INTEGER NOT NULL REFERENCES document_types(id) ON DELETE CASCADE,

    -- Which admin user granted this permission
    -- Stored for audit trail — who gave permission to whom
    -- ON DELETE SET NULL = if admin user deleted
    -- permission stays but granted_by becomes NULL
    granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

    -- When was this permission granted
    -- Useful for audit reports
    created_at TIMESTAMP DEFAULT NOW(),

    -- This constraint prevents duplicate permissions
    -- Same user cannot have same document type permission twice
    -- Example : if Raju already has Lorry Challan permission
    -- system will reject adding it again
    UNIQUE(user_id, doc_type_id)
);


-- ============================================================
-- TABLE 5 : documents
-- The most important table — heart of the entire system
-- Stores every document uploaded by every user
-- Each row = one complete document submission by one user
-- Contains all business details, location data and status
-- Actual photos are stored in document_photos table (Table 6)
-- ============================================================
CREATE TABLE documents (

    -- Unique ID for each document submission
    id SERIAL PRIMARY KEY,

    -- Which user uploaded this document
    -- Must be valid user from users table
    -- ON DELETE RESTRICT = cannot delete a user who has
    -- uploaded documents — protects data integrity
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- What category of document is this
    -- Must be valid type from document_types table
    -- ON DELETE RESTRICT = cannot delete a document type
    -- that has documents uploaded against it
    doc_type_id INTEGER NOT NULL REFERENCES document_types(id) ON DELETE RESTRICT,

    -- Which branch group this document belongs to
    -- User sees their own group by default in dropdown
    -- but can change to any other group if needed
    -- ON DELETE SET NULL = if group deleted, document stays
    group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,

    -- Document number — freely typed by user
    -- Example : Challan number, Manifest number, PAN number
    -- No validation — user types exactly what is on document
    -- NOT NULL = document number is always mandatory
    doc_no VARCHAR(100) NOT NULL,

    -- Document name — freely typed by user
    -- Example : Lorry number for Challan
    --           Staff name for KYC Staff
    --           Vendor name for KYC Vendor
    -- Optional field — user types what is relevant
    doc_name VARCHAR(100),

    -- Document group — freely typed by user
    -- This is an independent free text field
    -- User can type any grouping reference they want
    -- Example : consignment batch, route code, trip number
    -- Optional field
    doc_group VARCHAR(100),

    -- Date printed or written on the actual document
    -- Entered manually by user while uploading
    -- DATE type stores only date without time
    -- NOT NULL = document date is always mandatory
    doc_date DATE NOT NULL,

    -- GPS Latitude of where user is standing while uploading
    -- Automatically captured from mobile device GPS
    -- DECIMAL(10,8) = 10 total digits, 8 after decimal point
    -- This gives accuracy up to about 1 millimeter
    -- Example : 22.57264800 is Kolkata latitude
    latitude DECIMAL(10,8),

    -- GPS Longitude of where user is standing while uploading
    -- Automatically captured from mobile device GPS
    -- DECIMAL(11,8) = 11 total digits because longitude
    -- can go up to 180 degrees needing one extra digit
    -- Example : 88.36389500 is Kolkata longitude
    longitude DECIMAL(11,8),

    -- Human readable place name from GPS coordinates
    -- Automatically fetched from OpenStreetMap free API
    -- using the latitude and longitude captured above
    -- Example : 'Howrah, West Bengal, India'
    -- No subscription needed — completely free API
    place_name TEXT,

    -- Optional remarks or notes about this document
    -- User can add any additional information here
    notes TEXT,

    -- Current review status of this document
    -- pending  = freshly uploaded, admin not reviewed yet
    -- approved = admin verified and accepted the document
    -- rejected = admin rejected with a reason
    -- DEFAULT 'pending' = all new uploads start as pending
    -- CHECK constraint = only these 3 values are allowed
    -- any other value will be rejected by database
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),

    -- Reason why admin rejected this document
    -- Only filled when status is changed to 'rejected'
    -- Helps user understand what was wrong and resubmit
    rejection_reason TEXT,

    -- When was this document uploaded by user
    created_at TIMESTAMP DEFAULT NOW(),

    -- When was this document last modified by admin
    updated_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 6 : document_photos
-- Stores photo information for each document
-- Each document can have minimum 1 and maximum 5 photos
-- Each photo is stored as one separate row
-- Actual image file is stored on Cloudinary cloud storage
-- Only the web URL of the photo is stored in this table
-- Why separate table? Because one document = many photos
-- Storing multiple photos in documents table is bad design
-- Separate table is the professional database approach
-- ============================================================
CREATE TABLE document_photos (

    -- Unique ID for each photo record
    id SERIAL PRIMARY KEY,

    -- Which document this photo belongs to
    -- Must be valid document from documents table
    -- ON DELETE CASCADE = if document is deleted
    -- all its photos are automatically deleted too
    -- This keeps data clean with no orphan photos
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,

    -- Web URL of photo stored on Cloudinary cloud
    -- This is the complete web address to view the photo
    -- Example : https://res.cloudinary.com/mycloud/image/v1/doc.jpg
    -- We store URL here, actual file lives on Cloudinary servers
    -- NOT NULL = every photo record must have a URL
    photo_url TEXT NOT NULL,

    -- Which photo number is this for the document
    -- 1 = first photo, 2 = second photo, up to 5
    -- CHECK (photo_order BETWEEN 1 AND 5) = only 1 to 5 allowed
    -- Database will reject any value outside this range
    -- NOT NULL = every photo must have an order number
    photo_order INTEGER NOT NULL CHECK (photo_order BETWEEN 1 AND 5),

    -- File size of this photo in kilobytes
    -- Stored for monitoring total storage used
    -- Useful for admin reports on storage consumption
    -- Optional field
    file_size_kb INTEGER,

    -- Original name of the photo file before upload
    -- Example : 'IMG_20260411_143022.jpg'
    -- Useful for admin reference and downloads
    -- Optional field
    original_filename VARCHAR(255),

    -- When was this photo uploaded
    created_at TIMESTAMP DEFAULT NOW(),

    -- This constraint prevents duplicate photo order numbers
    -- for the same document
    -- Example : Document ID 5 cannot have two photos
    -- both with photo_order = 1
    -- First photo must be 1, second must be 2 etc.
    UNIQUE(document_id, photo_order)
);


-- ============================================================
-- INSERT DEFAULT DATA : GROUPS
-- Sample branch offices for your transport company
-- Admin can add, edit or deactivate branches later
-- from the admin panel we will build in future steps
-- ============================================================
INSERT INTO groups (name, code, address) VALUES
-- Head office is always the first and main branch
('Head Office',      'HO',  'Main office location'),
-- Regional branches across India
('Kolkata Branch',   'KOL', 'Kolkata, West Bengal'),
('Mumbai Branch',    'MUM', 'Mumbai, Maharashtra'),
('Delhi Branch',     'DEL', 'New Delhi'),
('Chennai Branch',   'CHN', 'Chennai, Tamil Nadu'),
('Hyderabad Branch', 'HYD', 'Hyderabad, Telangana');


-- ============================================================
-- INSERT DEFAULT DATA : DOCUMENT TYPES
-- 6 document types specific to your transport business
-- code field is the short identifier used in system
-- Admin can add more types from admin panel later
-- ============================================================
INSERT INTO document_types (name, code, description) VALUES
-- LC = Lorry Challan : most common document in transport
('Lorry Challan', 'LC',
 'Lorry challan with lorry number and challan details'),
-- MAN = Manifest : list of all consignments in one truck
('Manifest',      'MAN',
 'Manifest document listing all consignments in vehicle'),
-- CON = Consignment : individual goods booking document
('Consignment',   'CON',
 'Consignment note with sender and receiver details'),
-- POD = Proof of Delivery : confirms goods delivered
('POD',           'POD',
 'Proof of Delivery confirming goods received by consignee'),
-- KYCS = KYC Staff : identity verification for employees
('KYC Staff',     'KYCS',
 'KYC document for company staff identity verification'),
-- KYCV = KYC Vendor : identity verification for vendors
('KYC Vendor',    'KYCV',
 'KYC document for vendor or supplier verification');


-- ============================================================
-- INSERT DEFAULT DATA : ADMIN USER
-- One default admin user to start using the system
-- Mobile number : 9999999999
-- group_id = 1 means this admin belongs to Head Office
-- is_admin = TRUE gives full system access
-- Change this mobile to your real mobile number
-- so you can login as admin from day one
-- ============================================================
INSERT INTO users (name, mobile, group_id, is_admin) VALUES
('Admin User', '9999999999', 1, TRUE);


-- ============================================================
-- FINAL VERIFICATION
-- Run this to confirm all 6 tables were created successfully
-- Should show 6 rows with table names in result
-- ============================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;