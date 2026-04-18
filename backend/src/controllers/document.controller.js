// ============================================================
// document.controller.js --- Document Upload Logic
// FILE LOCATION : backend/src/controllers/document.controller.js
// ============================================================
// WHAT THIS FILE DOES :
// Handles all document upload operations
// When user submits a document form with photos this file :
// Step 1 : Validates all input data
// Step 2 : Checks user has permission for this document type
// Step 3 : Uploads all photos to Cloudinary
// Step 4 : Saves document record in documents table
// Step 5 : Saves photos in document_photos table
// Step 6 : Saves specific details in the detail table
//          Example : lorry_challan_details or kyc_staff_details
// Step 7 : Returns success response to frontend
// ============================================================

// db gives us query function to run SQL on PostgreSQL
const db = require('../config/db');

// uploadToCloudinary sends photo buffer to Cloudinary cloud
// Returns permanent https URL of uploaded photo
const { uploadToCloudinary } = require('../middleware/upload.middleware');

const clean = (val) => (val === "" ? null : val); // for data cleaning before insert into

// ============================================================
// CONTROLLER 1 : uploadDocument
// Called when user submits document form with photos
// URL : POST /api/documents/upload
// Input : form-data with photos + document details
// Output : { success: true, documentId: 5, message: '...' }
// ============================================================
const uploadDocument = async (req, res) => {

  try {

    // --------------------------------------------------------
    // STEP 1 : Get logged in user from JWT middleware
    // req.user is set by auth.middleware.js after token verify
    // Contains : userId, isAdmin etc.
    // --------------------------------------------------------
    const userId = req.user.userId;

    // --------------------------------------------------------
    // STEP 2 : Get form data from request body
    // These fields come from the frontend document form
    // doc_type_id : which type --- LC, WO, CON, POD, KYCS, KYCV
    // group_id : which branch this document belongs to
    // latitude : GPS latitude captured from mobile
    // longitude : GPS longitude captured from mobile
    // place_name : human readable location from GPS
    // details : JSON string of document type specific fields
    // --------------------------------------------------------
    const {
      doc_type_id,
      group_id,
      latitude,
      longitude,
      place_name,
      details  // JSON string --- parsed below
    } = req.body;
 
    // TEMPORARY DEBUG LINES
    //console.log('BODY received from Postman:', req.body);
    //console.log('FILES received from Postman:', req.files ? req.files.length : 0);
    //console.log('doc_type_id value:', doc_type_id);
    //console.log('group_id value:', group_id);

    // --------------------------------------------------------
    // STEP 3 : Validate required fields
    // doc_type_id and group_id are mandatory for every upload
    // --------------------------------------------------------
    if (!doc_type_id || !group_id) {
      return res.status(400).json({
        success: false,
        message: 'Document type and group are required'
      });
    }

    // --------------------------------------------------------
    // STEP 4 : Check at least one photo is uploaded
    // req.files = array of uploaded photos from multer
    // multer populates this from the multipart form data
    // --------------------------------------------------------
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one photo is required'
      });
    }

    // Maximum 10 photos allowed per document as decided
    if (req.files.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 photos allowed per document'
      });
    }

    // --------------------------------------------------------
    // STEP 5 : Check user has permission for this document type
    // Query user_document_permissions table
    // If no permission found --- reject the upload
    // --------------------------------------------------------
    const permissionCheck = await db.query(
      `SELECT id FROM user_document_permissions
       WHERE user_id = $1
       AND doc_type_id = $2`,
      [userId, doc_type_id]
    );

    // If admin skip permission check --- admin can upload all types
    const userCheck = await db.query(
      `SELECT is_admin FROM users WHERE id = $1`,
      [userId]
    );

    const isAdmin = userCheck.rows[0]?.is_admin;

    // If not admin AND no permission found --- reject
    if (!isAdmin && permissionCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to upload this document type'
      });
    }

    // --------------------------------------------------------
    // STEP 6 : Upload all photos to Cloudinary
    // Loop through each photo in req.files
    // Upload each one and collect the URLs
    // --------------------------------------------------------
    console.log(`Uploading ${req.files.length} photo(s) to Cloudinary...`);

    // photoUrls will store URLs of all uploaded photos
    // Example : ['https://res.cloudinary.com/...jpg',
    //            'https://res.cloudinary.com/...jpg']
    const photoUrls = [];

    // Loop through each uploaded photo file
    for (let i = 0; i < req.files.length; i++) {

      // req.files[i].buffer = raw bytes of this photo in memory
      // uploadToCloudinary sends it to cloud and returns URL
      const url = await uploadToCloudinary(req.files[i].buffer);

      // Add this photo URL to our collection
      photoUrls.push(url);

      console.log(`Photo ${i + 1} uploaded : ${url}`);

    }

    console.log('All photos uploaded successfully');

    // --------------------------------------------------------
    // STEP 7 : Save main document record in documents table
    // This creates the parent record that all photos and
    // detail records will link to via document_id
    // --------------------------------------------------------
    const documentResult = await db.query(
      `INSERT INTO documents
       (user_id, doc_type_id, group_id, latitude, longitude, place_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id`,
      // RETURNING id gives us the auto generated document id
      // We need this id to link photos and details to this document
      [userId, doc_type_id, group_id, latitude, longitude, place_name]
    );

    // Get the newly created document id
    // This is the id we will use for all related records
    const documentId = documentResult.rows[0].id;

    console.log('Document record created with id:', documentId);

    // --------------------------------------------------------
    // STEP 8 : Save each photo URL in document_photos table
    // Each photo gets its own row linked to the document
    // photo_order = 1 for first photo, 2 for second etc.
    // --------------------------------------------------------
    for (let i = 0; i < photoUrls.length; i++) {

      await db.query(
        `INSERT INTO document_photos
         (document_id, photo_url, photo_order, original_filename, file_size_kb)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          documentId,
          photoUrls[i],
          // photo_order starts at 1 not 0
          // i + 1 converts 0-based index to 1-based order
          i + 1,
          // original filename of the uploaded photo
          req.files[i].originalname,
          // file size in KB
          // req.files[i].size is in bytes so divide by 1024
          Math.round(req.files[i].size / 1024)
        ]
      );

    }

    console.log('All photo records saved in database');

    // --------------------------------------------------------
    // STEP 9 : Save document type specific details
    // Parse the details JSON string from request body
    // Save into the correct detail table based on doc_type_id
    // --------------------------------------------------------

    // Parse details JSON string into JavaScript object
    // details comes as string from form-data
    // JSON.parse converts it back to object
    let detailsData = {};
    if (details) {
      try {
        detailsData = JSON.parse(details);
      } catch (e) {
        // If JSON parsing fails use empty object
        // Document is still saved --- just without details
        console.log('Details parsing failed --- saved without details');
      }
    }

    // Get the document type code to know which table to use
    const docTypeResult = await db.query(
      `SELECT code FROM document_types WHERE id = $1`,
      [doc_type_id]
    );

    const docTypeCode = docTypeResult.rows[0]?.code;

    // Save details in the correct detail table
    // Each document type has its own table and fields
    await saveDocumentDetails(documentId, docTypeCode, detailsData);

    // --------------------------------------------------------
    // STEP 10 : Return success response to frontend
    // --------------------------------------------------------
    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      // Send back documentId so frontend can show confirmation
      documentId: documentId,
      // Send back number of photos uploaded
      photosUploaded: photoUrls.length
    });

  } catch (error) {

    // If any unexpected error occurs log it and return 500
    console.error('uploadDocument error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during upload. Please try again.'
    });

  }

};

// ============================================================
// HELPER FUNCTION : saveDocumentDetails
// Saves document type specific fields into correct detail table
// Called from uploadDocument after main document record saved
// Parameters :
// documentId = id from documents table (foreign key)
// docTypeCode = 'LC', 'WO', 'CON', 'POD', 'KYCS', 'KYCV'
// data = object with all the specific fields for this type
// ============================================================
const saveDocumentDetails = async (documentId, docTypeCode, data) => {

  // Switch on document type code to save in correct table
  switch (docTypeCode) {

    case 'LC':
      // -------------------------------------------------------
      // LORRY CHALLAN DETAILS
      // Table : lorry_challan_details
      // Fields : lc_no, ref_no, lc_date, remarks
      // -------------------------------------------------------
      await db.query(
        `INSERT INTO lorry_challan_details
         (document_id, lc_no, ref_no, lc_date, remarks)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          documentId,
          data.lc_no || null,
          data.ref_no || null,
          data.lc_date || null,
          data.remarks || null
        ]
      );
      break;

    case 'WO':
      // -------------------------------------------------------
      // WORK ORDER DETAILS
      // Table : work_order_details
      // Fields : wo_no, client_name, site, work_details,
      //          project_name, start_date, end_date,
      //          expense_value, gst_rate, loi_received,
      //          loi_value, remarks
      // -------------------------------------------------------
      await db.query(
        `INSERT INTO work_order_details
         (document_id, wo_no, client_name, site_location,
          work_details, project_name, work_start_date,
          work_end_date, expense_value, gst_rate,
          loi_received, loi_value, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          documentId,
          data.wo_no || null,
          data.client_name || null,
          data.site_location || null,
          data.work_details || null,
          data.project_name || null,
          data.work_start_date || null,
          data.work_end_date || null,
          data.expense_value || null,
          data.gst_rate || null,
          data.loi_received || false,
          data.loi_value || null,
          data.remarks || null
        ]
      );
      break;

    case 'CON':
      // -------------------------------------------------------
      // CONSIGNMENT DETAILS
      // Table : consignment_details
      // Fields : cn_no, remarks
      // -------------------------------------------------------
      await db.query(
        `INSERT INTO consignment_details
         (document_id, cn_no, remarks)
         VALUES ($1, $2, $3)`,
        [
          documentId,
          data.cn_no || null,
          data.remarks || null
        ]
      );
      break;

    case 'POD':
      // -------------------------------------------------------
      // POD DETAILS
      // Table : pod_details
      // Fields : cn_no, original_received, claim_amount,
      //          extra_expense, remarks
      // -------------------------------------------------------
      await db.query(
        `INSERT INTO pod_details
         (document_id, cn_no, original_received,
          claim_amount, extra_expense, remarks)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [
          documentId,
          data.cn_no || null,
          data.original_received || false,
          data.claim_amount || null,
          data.extra_expense || null,
          data.remarks || null
        ]
      );
      break;

    case 'KYCS':
      // -------------------------------------------------------
      // KYC STAFF DETAILS
      // Table : kyc_staff_details
      // Fields : all 20+ staff fields
      // -------------------------------------------------------
      console.log("KYCS DATA RECEIVED:", data);
            // Check PAN exists
      const panCheck = await db.query(
        "SELECT * FROM pan_master WHERE pan_no = $1",
        [data.pan_no]
      );

      if (panCheck.rows.length === 0) {
        await db.query(
          "INSERT INTO pan_master (pan_no, name) VALUES ($1, $2)",
          [data.pan_no, data.full_name || "Unknown"]
        );
      }
      await db.query(
        `INSERT INTO kyc_staff_details
         (document_id, full_name, nick_name, staff_mobile,
          email, pan_no, aadhar_no, aadhar_mobile_linked,
          bank_account_no, bank_ifsc, bank_name, bank_branch,
          upi_id, driving_license_no, license_expiry_date,
          license_types, mobile,
          full_address, state, city, pincode, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                 $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
          [
        documentId,                      // $1

        data.full_name || null,          // $2
        data.nick_name || null,          // $3

        data.mobile || null,             // $4 → staff_mobile ✅
        data.email || null,              // $5

        data.pan_no || null,             // $6
        data.aadhar_no || null,          // $7
        data.aadhar_mobile_linked || false, // $8

        data.bank_account_no || null,    // $9
        data.bank_ifsc || null,          // $10

        data.bank_name || null,          // $11
        data.bank_branch || null,        // $12

        data.upi_id || null,             // $13

        data.driving_license_no || null, // $14
        data.license_expiry_date || null,// $15
        data.license_types || null,      // $16

        data.mobile || null,             // $17 → mobile_no ✅ CRITICAL

        data.full_address || null,       // $18
        data.state || null,              // $19
        data.city || null,               // $20
        data.pincode || null,            // $21
        data.remarks || null             // $22
      ]
      );
      break;

    case 'KYCV':
      // -------------------------------------------------------
      // KYC VENDOR DETAILS
      // Table : kyc_vendor_details
      // Fields : all vendor fields
      // -------------------------------------------------------
     console.log("KYCV DATA RECEIVED:", data);
            // Check PAN exists
      const panCheckVendor = await db.query(
        "SELECT * FROM pan_master WHERE pan_no = $1",
        [data.pan_no]
      );

      if (panCheckVendor.rows.length === 0) {
        await db.query(
          "INSERT INTO pan_master (pan_no, name) VALUES ($1, $2)",
          [data.pan_no, data.business_name || "Vendor"]
        );
      }


      await db.query(
      `INSERT INTO kyc_vendor_details
      (document_id, vendor_type, business_name, authorized_person,
        vendor_mobile, email, introducer_name,
        pan_no, aadhar_no, gst_no,
        bank_account_no, bank_ifsc, bank_name, bank_branch,
        remarks)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        documentId,
        data.vendor_type || null,
        data.business_name || null,
        data.authorized_person || null,
        clean(data.vendor_mobile),   // ✅
        data.email || null,
        data.introducer_name || null,
        data.pan_no || null,
        clean(data.aadhar_no),       // ✅
        data.gst_no || null,
        clean(data.bank_account_no), // ✅
        data.bank_ifsc || null,
        data.bank_name || null,
        data.bank_branch || null,
        data.remarks || null
      ]
    );
      break;

    default:
      // Unknown document type --- log warning but do not crash
      console.log('Warning: Unknown document type code:', docTypeCode);

  }

};

// ============================================================
// CONTROLLER 2 : getMyDocuments
// Returns list of documents uploaded by logged in user
// URL : GET /api/documents/my
// Output : { success: true, documents: [...] }
// ============================================================
const getMyDocuments = async (req, res) => {

  try {

    // Get logged in user id from JWT middleware
    const userId = req.user.userId;

    // Fetch all documents for this user
    // JOIN with document_types to get type name
    // JOIN with groups to get group name
    // ORDER BY created_at DESC = newest documents first
    const result = await db.query(
      `SELECT
         d.id,
         d.status,
         d.place_name,
         d.created_at,
         dt.name as doc_type_name,
         dt.code as doc_type_code,
         g.name as group_name,
         -- Count photos for each document using subquery
         (SELECT COUNT(*) FROM document_photos
          WHERE document_id = d.id) as photo_count
       FROM documents d
       JOIN document_types dt ON d.doc_type_id = dt.id
       JOIN groups g ON d.group_id = g.id
       WHERE d.user_id = $1
       ORDER BY d.created_at DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      // result.rows = array of document objects
      documents: result.rows,
      // total count for frontend pagination
      total: result.rows.length
    });

  } catch (error) {
    console.error('getMyDocuments error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error. Please try again.'
    });
  }

};

// ============================================================
// EXPORT all controllers
// These are imported and used in document.routes.js
// ============================================================
module.exports = { uploadDocument, getMyDocuments };