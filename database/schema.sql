-- ============================================================
-- schema_v3.sql — Complete Database Schema Version 3
-- Transport Company Document Management System
-- PostgreSQL Version 18
-- Changes from v2 :
--   1. Added pan_master table for PAN autocomplete
--   2. Added state_master table for state dropdown
--   3. Added city_master table linked to states
--   4. Added 6 document detail tables one per doc type
--   5. Replaced Manifest with Work Order document type
--   6. Increased photo limit from 5 to 10
--   7. Moved doc_no doc_name doc_group doc_date to detail tables
--   8. Added driving license types for India
--   9. Added vendor types
--   10. Added GST rate columns in work order
--   11. Added bank IFSC auto fetch provision
--   12. Added UPI number field for staff
-- ============================================================


-- ============================================================
-- DROP ALL TABLES IN CORRECT ORDER
-- Child tables must be dropped before parent tables
-- because of foreign key dependencies between them
-- ============================================================
DROP TABLE IF EXISTS kyc_vendor_details CASCADE;
DROP TABLE IF EXISTS kyc_staff_details CASCADE;
DROP TABLE IF EXISTS pod_details CASCADE;
DROP TABLE IF EXISTS consignment_details CASCADE;
DROP TABLE IF EXISTS work_order_details CASCADE;
DROP TABLE IF EXISTS lorry_challan_details CASCADE;
DROP TABLE IF EXISTS document_photos CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS user_document_permissions CASCADE;
DROP TABLE IF EXISTS document_types CASCADE;
DROP TABLE IF EXISTS pan_master CASCADE;
DROP TABLE IF EXISTS city_master CASCADE;
DROP TABLE IF EXISTS state_master CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS groups CASCADE;


-- ============================================================
-- TABLE 1 : groups
-- Master table for all branch offices of the company
-- Every user belongs to one branch group
-- Users can select any group while uploading documents
-- ============================================================
CREATE TABLE groups (
    -- Auto generated unique ID for each group
    id SERIAL PRIMARY KEY,

    -- Full name of the branch
    -- Example : Kolkata Branch, Head Office
    name VARCHAR(100) NOT NULL,

    -- Short code for quick reference
    -- Example : KOL, MUM, HO
    -- UNIQUE = no two groups can have same code
    code VARCHAR(20) NOT NULL UNIQUE,

    -- Full address of this branch office (optional)
    address TEXT,

    -- Name of person in charge at this branch (optional)
    contact_person VARCHAR(100),

    -- Contact phone of this branch (optional)
    contact_phone VARCHAR(15),

    -- Is this branch active and visible in dropdowns?
    -- FALSE = hidden from users cannot be selected
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 2 : state_master
-- Stores all Indian states and union territories
-- Used for state dropdown in KYC forms
-- City master is linked to this table
-- Once entered states appear in autocomplete dropdown
-- ============================================================
CREATE TABLE state_master (
    -- Auto generated unique ID for each state
    id SERIAL PRIMARY KEY,

    -- Full name of the state or union territory
    -- Example : West Bengal, Maharashtra, Tamil Nadu
    -- UNIQUE = no duplicate state names allowed
    name VARCHAR(100) NOT NULL UNIQUE,

    -- Standard 2 letter state code used in India
    -- Example : WB, MH, TN, DL, KA
    -- UNIQUE = no duplicate codes allowed
    code VARCHAR(5) NOT NULL UNIQUE,

    -- Is this state active and visible in dropdown?
    is_active BOOLEAN DEFAULT TRUE,

    -- When was this state record created
    created_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 3 : city_master
-- Stores cities linked to their parent state
-- When user selects a state only that state cities show
-- New cities are automatically added when user types a new one
-- This creates the smart autocomplete dropdown behavior
-- ============================================================
CREATE TABLE city_master (
    -- Auto generated unique ID for each city
    id SERIAL PRIMARY KEY,

    -- Full name of the city
    -- Example : Kolkata, Mumbai, Chennai
    name VARCHAR(100) NOT NULL,

    -- Which state this city belongs to
    -- REFERENCES state_master(id) = must be valid state
    -- ON DELETE CASCADE = if state deleted cities also delete
    state_id INTEGER NOT NULL REFERENCES state_master(id)
        ON DELETE CASCADE,

    -- Is this city active and visible in dropdown?
    is_active BOOLEAN DEFAULT TRUE,

    -- When was this city added to master
    created_at TIMESTAMP DEFAULT NOW(),

    -- Prevent duplicate city names within same state
    -- Same city name can exist in different states
    -- Example : Salem exists in Tamil Nadu and other states
    UNIQUE(name, state_id)
);


-- ============================================================
-- TABLE 4 : pan_master
-- Stores PAN numbers with associated person or business name
-- Shared across KYC Staff and KYC Vendor both
-- Smart behavior :
--   First time PAN entered = user types name manually
--   Name gets saved here against the PAN number
--   Next time same PAN entered = name auto fills from here
--   Works for both staff PAN and vendor PAN
-- ============================================================
CREATE TABLE pan_master (
    -- Auto generated unique ID
    id SERIAL PRIMARY KEY,

    -- PAN number — exactly 10 characters as per India standard
    -- Format : AAAAA9999A (5 letters, 4 digits, 1 letter)
    -- UNIQUE = each PAN stored only once in master
    -- UPPER(pan_no) ensures always stored in uppercase
    pan_no VARCHAR(10) NOT NULL UNIQUE,

    -- Full name of person or business linked to this PAN
    -- Fetched from Income Tax records or entered by user
    name VARCHAR(200) NOT NULL,

    -- Type of PAN holder
    -- individual = person (staff, driver etc.)
    -- business   = company or firm (vendor)
    -- CHECK ensures only these two values are allowed
    pan_type VARCHAR(20) DEFAULT 'individual'
        CHECK (pan_type IN ('individual', 'business')),

    -- When was this PAN first entered in our system
    created_at TIMESTAMP DEFAULT NOW(),

    -- When was this PAN record last updated
    updated_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 5 : users
-- Stores all users of the system
-- Admin users have full access
-- Field users can only upload permitted document types
-- Login is via mobile OTP — no password needed
-- ============================================================
CREATE TABLE users (
    -- Auto generated unique ID for each user
    id SERIAL PRIMARY KEY,

    -- Full name of the user
    name VARCHAR(100) NOT NULL,

    -- Mobile number used for OTP login
    -- UNIQUE = no two users can share same mobile number
    -- Stored as text because mobile can start with 0
    mobile VARCHAR(15) NOT NULL UNIQUE,

    -- Which branch this user belongs to
    -- Links to groups table
    -- SET NULL = if group deleted user stays ungrouped
    group_id INTEGER REFERENCES groups(id)
        ON DELETE SET NULL,

    -- Is this user an administrator?
    -- TRUE  = full system access manage users reports
    -- FALSE = field user can only upload documents
    is_admin BOOLEAN DEFAULT FALSE,

    -- Is this user account active?
    -- FALSE = blocked user cannot login
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 6 : document_types
-- Master list of 6 document types for transport business
-- Admin can add deactivate or manage types from admin panel
-- ============================================================
CREATE TABLE document_types (
    -- Auto generated unique ID
    id SERIAL PRIMARY KEY,

    -- Full name shown in user dropdown
    -- Example : Lorry Challan, Work Order, POD
    name VARCHAR(100) NOT NULL,

    -- Short code used internally
    -- Example : LC, WO, CON, POD, KYCS, KYCV
    code VARCHAR(20) NOT NULL UNIQUE,

    -- Description explaining this document type
    description TEXT,

    -- Is this type visible in user dropdown?
    is_active BOOLEAN DEFAULT TRUE,

    -- When was this type created
    created_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 7 : user_document_permissions
-- Controls which user can upload which document type
-- Admin assigns permissions individually per user
-- Without permission user cannot see that document type
-- ============================================================
CREATE TABLE user_document_permissions (
    -- Auto generated unique ID
    id SERIAL PRIMARY KEY,

    -- Which user has this permission
    -- CASCADE = if user deleted permissions auto delete
    user_id INTEGER NOT NULL REFERENCES users(id)
        ON DELETE CASCADE,

    -- Which document type is permitted
    -- CASCADE = if doc type deleted permission auto deletes
    doc_type_id INTEGER NOT NULL REFERENCES document_types(id)
        ON DELETE CASCADE,

    -- Which admin granted this permission (audit trail)
    -- SET NULL = if admin deleted permission stays
    granted_by INTEGER REFERENCES users(id)
        ON DELETE SET NULL,

    -- When was permission granted
    created_at TIMESTAMP DEFAULT NOW(),

    -- Prevent duplicate permissions for same user and type
    UNIQUE(user_id, doc_type_id)
);


-- ============================================================
-- TABLE 8 : documents
-- Main document table — stores common fields for ALL types
-- Each row = one document submission by one user
-- Specific fields for each type stored in detail tables
-- This is the PARENT table — all detail tables link here
-- ============================================================
CREATE TABLE documents (
    -- Auto generated unique ID for each submission
    id SERIAL PRIMARY KEY,

    -- Which user uploaded this document
    -- RESTRICT = cannot delete user who has documents
    user_id INTEGER NOT NULL REFERENCES users(id)
        ON DELETE RESTRICT,

    -- What type of document is this
    -- RESTRICT = cannot delete type that has documents
    doc_type_id INTEGER NOT NULL REFERENCES document_types(id)
        ON DELETE RESTRICT,

    -- Which branch group this document belongs to
    -- User sees own group by default but can change
    -- SET NULL = if group deleted document stays
    group_id INTEGER REFERENCES groups(id)
        ON DELETE SET NULL,

    -- GPS Latitude captured automatically from mobile
    -- DECIMAL(10,8) = precise GPS coordinate storage
    -- Example : 22.57264800 for Kolkata
    latitude DECIMAL(10,8),

    -- GPS Longitude captured automatically from mobile
    -- DECIMAL(11,8) = one extra digit for longitude range
    -- Example : 88.36389500 for Kolkata
    longitude DECIMAL(11,8),

    -- Human readable place name from GPS coordinates
    -- Auto fetched from OpenStreetMap free API
    -- Example : Howrah, West Bengal, India
    place_name TEXT,

    -- Current review status of this document
    -- pending  = uploaded waiting for admin review
    -- approved = admin verified and accepted
    -- rejected = admin rejected with reason
    -- CHECK = only these 3 values allowed
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),

    -- Reason for rejection filled by admin
    -- Only used when status = rejected
    rejection_reason TEXT,

    -- When was this document uploaded
    created_at TIMESTAMP DEFAULT NOW(),

    -- When was this document last updated by admin
    updated_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 9 : document_photos
-- Stores photos for each document submission
-- Maximum 10 photos per document as decided
-- Each photo = one row linked to documents table
-- Actual photo file stored on Cloudinary cloud
-- Only the web URL is stored here
-- ============================================================
CREATE TABLE document_photos (
    -- Auto generated unique ID for each photo
    id SERIAL PRIMARY KEY,

    -- Which document this photo belongs to
    -- CASCADE = if document deleted photos auto delete
    document_id INTEGER NOT NULL REFERENCES documents(id)
        ON DELETE CASCADE,

    -- Web URL of photo on Cloudinary cloud storage
    -- Example : https://res.cloudinary.com/myapp/image/...
    -- NOT NULL = every photo must have a valid URL
    photo_url TEXT NOT NULL,

    -- Photo sequence number 1 to 10
    -- 1 = first photo, 2 = second and so on
    -- CHECK = only values 1 through 10 are allowed
    photo_order INTEGER NOT NULL
        CHECK (photo_order BETWEEN 1 AND 10),

    -- File size in kilobytes for storage monitoring
    file_size_kb INTEGER,

    -- Original filename before upload for reference
    original_filename VARCHAR(255),

    -- Optional description of what this photo shows
    -- Example : Front side, Back side, Supporting proof
    photo_description VARCHAR(200),

    -- When was this photo uploaded
    created_at TIMESTAMP DEFAULT NOW(),

    -- Prevent duplicate photo order for same document
    -- Document 5 cannot have two photos with order = 1
    UNIQUE(document_id, photo_order)
);


-- ============================================================
-- TABLE 10 : lorry_challan_details
-- Specific fields for Lorry Challan document type
-- Each row links to one row in documents table
-- Simple document with few fields
-- ============================================================
CREATE TABLE lorry_challan_details (
    -- Auto generated unique ID
    id SERIAL PRIMARY KEY,

    -- Links to the parent documents table
    -- UNIQUE = one LC detail per document submission
    -- CASCADE = if document deleted detail auto deletes
    document_id INTEGER NOT NULL UNIQUE
        REFERENCES documents(id) ON DELETE CASCADE,

    -- Lorry Challan number — primary reference number
    -- Free text — user types exactly as on challan
    lc_no VARCHAR(100) NOT NULL,

    -- Reference number if any — optional secondary number
    ref_no VARCHAR(100),

    -- Date printed on the lorry challan
    lc_date DATE NOT NULL,

    -- Additional remarks or notes about this challan
    remarks TEXT,

    -- When was this detail record created
    created_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 11 : work_order_details
-- Specific fields for Work Order document type
-- Replaces Manifest as per business requirement
-- Contains project and financial details
-- ============================================================
CREATE TABLE work_order_details (
    -- Auto generated unique ID
    id SERIAL PRIMARY KEY,

    -- Links to the parent documents table
    -- UNIQUE = one WO detail per document submission
    document_id INTEGER NOT NULL UNIQUE
        REFERENCES documents(id) ON DELETE CASCADE,

    -- Work Order number — primary reference
    wo_no VARCHAR(100) NOT NULL,

    -- Name of the client who gave this work order
    client_name VARCHAR(200) NOT NULL,

    -- Site or location where work is to be done
    site_location VARCHAR(200),

    -- Detailed description of work to be done
    work_details TEXT,

    -- Name of the project this work order belongs to
    project_name VARCHAR(200),

    -- Date when work is scheduled to start
    work_start_date DATE,

    -- Date when work is scheduled to end
    work_end_date DATE,

    -- Total expense value of work WITHOUT GST
    -- DECIMAL(15,2) = supports values up to 999,999,999,999,999
    -- with 2 decimal places for paise
    expense_value DECIMAL(15,2),

    -- GST rate applicable on this work order
    -- Free text with dropdown — user can type or select
    -- Example : 18%, 12%, 5%, 0%
    gst_rate VARCHAR(10),

    -- Has the party sent Letter of Intent?
    -- TRUE = LOI received, FALSE = LOI not yet received
    loi_received BOOLEAN DEFAULT FALSE,

    -- Value mentioned in the LOI WITHOUT GST
    -- Only filled if loi_received = TRUE
    loi_value DECIMAL(15,2),

    -- GST rate on LOI value
    loi_gst_rate VARCHAR(10),

    -- Additional remarks about this work order
    remarks TEXT,

    -- When was this detail record created
    created_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 12 : consignment_details
-- Specific fields for Consignment Note (CN) document type
-- CN is the primary booking document for goods transport
-- ============================================================
CREATE TABLE consignment_details (
    -- Auto generated unique ID
    id SERIAL PRIMARY KEY,

    -- Links to the parent documents table
    -- UNIQUE = one CN detail per document submission
    document_id INTEGER NOT NULL UNIQUE
        REFERENCES documents(id) ON DELETE CASCADE,

    -- Consignment Note number — primary reference
    -- This CN number is referenced by POD documents
    cn_no VARCHAR(100) NOT NULL,

    -- Additional remarks about this consignment
    remarks TEXT,

    -- When was this detail record created
    created_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 13 : pod_details
-- Specific fields for Proof of Delivery document type
-- POD confirms goods were delivered to consignee
-- May reference a CN number from consignment_details
-- ============================================================
CREATE TABLE pod_details (
    -- Auto generated unique ID
    id SERIAL PRIMARY KEY,

    -- Links to the parent documents table
    -- UNIQUE = one POD detail per document submission
    document_id INTEGER NOT NULL UNIQUE
        REFERENCES documents(id) ON DELETE CASCADE,

    -- CN number this POD is for
    -- Free text = user types manually
    -- May or may not match an existing CN in database
    cn_no VARCHAR(100),

    -- Was the original document received by sender?
    -- TRUE = yes original received, FALSE = not yet received
    original_received BOOLEAN DEFAULT FALSE,

    -- Claim amount if any damage or shortage
    -- DECIMAL(15,2) = supports large amounts with paise
    -- NULL = no claim
    claim_amount DECIMAL(15,2),

    -- Extra expenses incurred during delivery
    -- NULL = no extra expenses
    extra_expense DECIMAL(15,2),

    -- Description of what the extra expense was for
    extra_expense_remarks TEXT,

    -- Additional remarks about this POD
    remarks TEXT,

    -- When was this detail record created
    created_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 14 : kyc_staff_details
-- Complete KYC information for company staff
-- Contains personal, identity, bank and license details
-- Most comprehensive detail table in the system
-- ============================================================
CREATE TABLE kyc_staff_details (
    -- Auto generated unique ID
    id SERIAL PRIMARY KEY,

    -- Links to the parent documents table
    -- UNIQUE = one KYC detail per document submission
    document_id INTEGER NOT NULL UNIQUE
        REFERENCES documents(id) ON DELETE CASCADE,

    -- --------------------------------------------------------
    -- PERSONAL DETAILS
    -- --------------------------------------------------------

    -- Full legal name of the staff member
    full_name VARCHAR(200) NOT NULL,

    -- Nick name or commonly used name (optional)
    nick_name VARCHAR(100),

    -- Mobile number of this staff member
    -- Stored separately from login mobile of uploader
    staff_mobile VARCHAR(15),

    -- Email address of this staff member (optional)
    email VARCHAR(200),

    -- Complete residential address (optional)
    full_address TEXT,

    -- State of residence — free text with autocomplete
    -- Links display to state_master but stored as text
    -- for flexibility if state not in master yet
    state VARCHAR(100),

    -- City of residence — free text with autocomplete
    -- Filtered by selected state in dropdown
    city VARCHAR(100),

    -- PIN code of residential address
    pincode VARCHAR(6),

    -- Emergency contact number (optional)
    emergency_contact VARCHAR(15),

    -- --------------------------------------------------------
    -- IDENTITY DETAILS
    -- --------------------------------------------------------

    -- PAN card number — links to pan_master for autocomplete
    -- When this PAN exists in pan_master full_name auto fills
    -- VARCHAR(10) = standard Indian PAN format
    pan_no VARCHAR(10) REFERENCES pan_master(pan_no)
        ON DELETE SET NULL,

    -- Aadhar card number — 12 digits as per UIDAI standard
    aadhar_no VARCHAR(12),

    -- Is this Aadhar number linked to mobile number?
    -- TRUE = linked, FALSE = not linked
    aadhar_mobile_linked BOOLEAN DEFAULT FALSE,

    -- --------------------------------------------------------
    -- BANK DETAILS
    -- --------------------------------------------------------

    -- Bank account number of this staff member
    bank_account_no VARCHAR(20),

    -- IFSC code of the bank branch
    -- Used to auto fetch bank name and branch via free API
    -- Format : 4 letters + 0 + 6 alphanumeric = 11 chars
    bank_ifsc VARCHAR(11),

    -- Bank name auto fetched from IFSC using free API
    -- razorpay provides free IFSC lookup API
    -- Stored here after fetch so no repeated API calls
    bank_name VARCHAR(200),

    -- Bank branch name auto fetched from IFSC API
    bank_branch VARCHAR(200),

    -- --------------------------------------------------------
    -- UPI DETAILS
    -- --------------------------------------------------------

    -- UPI ID or VPA of this staff member
    -- Format : mobilenumber@bankcode or name@bankcode
    -- Example : 9876543210@oksbi or ramesh@ybl
    upi_id VARCHAR(100),

    -- --------------------------------------------------------
    -- DRIVING LICENSE DETAILS
    -- --------------------------------------------------------

    -- Driving license number issued by RTO
    driving_license_no VARCHAR(20),

    -- License expiry date — important for driver compliance
    license_expiry_date DATE,

    -- Types of vehicles this person is licensed to drive
    -- Multiple types possible — stored as PostgreSQL ARRAY
    -- Example : {LMV, HMV} or {MCWG, LMV}
    -- Possible values : LMV, HMV, MCWG, MCWOG, MGV,
    --                   HGV, HPMV, PSV, Trailer
    license_types TEXT[],

    -- --------------------------------------------------------
    -- REMARKS
    -- --------------------------------------------------------

    -- Any additional remarks about this staff member
    remarks TEXT,

    -- When was this KYC detail record created
    created_at TIMESTAMP DEFAULT NOW(),

    -- When was this KYC detail last updated
    updated_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- TABLE 15 : kyc_vendor_details
-- Complete KYC information for vendors and suppliers
-- Contains business, identity, bank and GST details
-- ============================================================
CREATE TABLE kyc_vendor_details (
    -- Auto generated unique ID
    id SERIAL PRIMARY KEY,

    -- Links to the parent documents table
    -- UNIQUE = one KYC detail per document submission
    document_id INTEGER NOT NULL UNIQUE
        REFERENCES documents(id) ON DELETE CASCADE,

    -- --------------------------------------------------------
    -- VENDOR TYPE
    -- --------------------------------------------------------

    -- Type of vendor — free text with autocomplete dropdown
    -- Options : Transporter, Supplier, Contractor,
    --           Agency, Freelancer
    -- User can add new types — saved for future autocomplete
    vendor_type VARCHAR(100),

    -- --------------------------------------------------------
    -- BUSINESS DETAILS
    -- --------------------------------------------------------

    -- Registered business name of the vendor
    business_name VARCHAR(200) NOT NULL,

    -- Name of the authorized person for this vendor
    -- Person who signs documents and represents business
    authorized_person VARCHAR(200),

    -- Contact mobile number of vendor
    vendor_mobile VARCHAR(15),

    -- Email address of vendor (optional)
    email VARCHAR(200),

    -- Name of person who introduced or referred this vendor
    -- Important for accountability in transport business
    introducer_name VARCHAR(200),

    -- --------------------------------------------------------
    -- IDENTITY DETAILS
    -- --------------------------------------------------------

    -- PAN number of vendor or business
    -- Links to pan_master for autocomplete
    -- When PAN exists business_name or authorized_person
    -- can be auto filled from pan_master
    pan_no VARCHAR(10) REFERENCES pan_master(pan_no)
        ON DELETE SET NULL,

    -- Aadhar number of authorized person
    aadhar_no VARCHAR(12),

    -- --------------------------------------------------------
    -- GST DETAILS
    -- --------------------------------------------------------

    -- GST Registration number of vendor
    -- Format : 2 digits state code + 10 char PAN +
    --          1 digit entity + Z + 1 check digit = 15 chars
    gst_no VARCHAR(15),

    -- --------------------------------------------------------
    -- BANK DETAILS
    -- --------------------------------------------------------

    -- Bank account number of vendor
    bank_account_no VARCHAR(20),

    -- IFSC code for auto fetching bank details
    bank_ifsc VARCHAR(11),

    -- Bank name auto fetched from IFSC free API
    bank_name VARCHAR(200),

    -- Bank branch auto fetched from IFSC free API
    bank_branch VARCHAR(200),

    -- --------------------------------------------------------
    -- REMARKS
    -- --------------------------------------------------------

    -- Additional remarks about this vendor
    remarks TEXT,

    -- When was this vendor KYC created
    created_at TIMESTAMP DEFAULT NOW(),

    -- When was this vendor KYC last updated
    updated_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- INSERT DEFAULT DATA : GROUPS
-- ============================================================
INSERT INTO groups (name, code, address) VALUES
('Head Office',      'HO',  'Main office location'),
('Kolkata Branch',   'KOL', 'Kolkata, West Bengal'),
('Mumbai Branch',    'MUM', 'Mumbai, Maharashtra'),
('Delhi Branch',     'DEL', 'New Delhi'),
('Chennai Branch',   'CHN', 'Chennai, Tamil Nadu'),
('Hyderabad Branch', 'HYD', 'Hyderabad, Telangana');


-- ============================================================
-- INSERT DEFAULT DATA : STATES
-- All 28 Indian states and 8 union territories
-- ============================================================
INSERT INTO state_master (name, code) VALUES
('Andhra Pradesh',        'AP'),
('Arunachal Pradesh',     'AR'),
('Assam',                 'AS'),
('Bihar',                 'BR'),
('Chhattisgarh',          'CG'),
('Goa',                   'GA'),
('Gujarat',               'GJ'),
('Haryana',               'HR'),
('Himachal Pradesh',      'HP'),
('Jharkhand',             'JH'),
('Karnataka',             'KA'),
('Kerala',                'KL'),
('Madhya Pradesh',        'MP'),
('Maharashtra',           'MH'),
('Manipur',               'MN'),
('Meghalaya',             'ML'),
('Mizoram',               'MZ'),
('Nagaland',              'NL'),
('Odisha',                'OD'),
('Punjab',                'PB'),
('Rajasthan',             'RJ'),
('Sikkim',                'SK'),
('Tamil Nadu',            'TN'),
('Telangana',             'TS'),
('Tripura',               'TR'),
('Uttar Pradesh',         'UP'),
('Uttarakhand',           'UK'),
('West Bengal',           'WB'),
('Andaman and Nicobar',   'AN'),
('Chandigarh',            'CH'),
('Dadra and Nagar Haveli','DN'),
('Daman and Diu',         'DD'),
('Delhi',                 'DL'),
('Jammu and Kashmir',     'JK'),
('Ladakh',                'LA'),
('Lakshadweep',           'LD'),
('Puducherry',            'PY');


-- ============================================================
-- INSERT DEFAULT DATA : DOCUMENT TYPES
-- 6 types — Manifest replaced by Work Order
-- ============================================================
INSERT INTO document_types (name, code, description) VALUES
('Lorry Challan', 'LC',
 'Lorry challan with lorry number and challan details'),
('Work Order',    'WO',
 'Work order from client with project and financial details'),
('Consignment',   'CON',
 'Consignment note with sender and receiver details'),
('POD',           'POD',
 'Proof of Delivery confirming goods received by consignee'),
('KYC Staff',     'KYCS',
 'Complete KYC document for company staff verification'),
('KYC Vendor',    'KYCV',
 'Complete KYC document for vendor or supplier verification');


-- ============================================================
-- INSERT DEFAULT DATA : ADMIN USER
-- Default admin user to start the system
-- Change mobile to your real number
-- ============================================================
INSERT INTO users (name, mobile, group_id, is_admin) VALUES
('Admin User', '9999999999', 1, TRUE);


-- ============================================================
-- FINAL VERIFICATION
-- Should show 15 tables in result
-- ============================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;



-- ============================================================
-- VERIFY ALL DEFAULT DATA INSERTED CORRECTLY
-- ============================================================

-- Check 6 branch groups
SELECT 'GROUPS' as check_item, 
       COUNT(*) as total_records 
FROM groups

UNION ALL

-- Check 37 Indian states and union territories
SELECT 'STATES', 
       COUNT(*) 
FROM state_master

UNION ALL

-- Check 6 document types with Work Order
SELECT 'DOCUMENT TYPES', 
       COUNT(*) 
FROM document_types

UNION ALL

-- Check 1 admin user created
SELECT 'USERS', 
       COUNT(*) 
FROM users;
