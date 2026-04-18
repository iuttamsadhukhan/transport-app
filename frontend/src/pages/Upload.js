import { useState, useRef } from "react";
import API from "../api/api";

export default function Upload() {

  // =========================
  // 🧠 STATES
  // =========================
  const [files, setFiles] = useState([]); 
  // stores selected files

  const [progress, setProgress] = useState(0); 
  // upload progress %

  const [latitude, setLatitude] = useState(""); 
  const [longitude, setLongitude] = useState(""); 
  // GPS coordinates

  const [docType, setDocType] = useState(""); 
  // selected document type

  const [details, setDetails] = useState({}); 
  // dynamic form data

  const fileInputRef = useRef(null); 
  // reference to file input (to clear it)

  // =========================
  // 📍 GET GPS LOCATION
  // =========================
  const getLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
    });
  };

  // =========================
  // 📸 FILE SELECT HANDLER
  // =========================
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]); 
    // append multiple files
  };

  // =========================
  // ❌ REMOVE FILE
  // =========================
  const removeFile = (indexToRemove) => {
    setFiles(
      files.filter((_, index) => index !== indexToRemove)
    );
  };

  // =========================
  // 🚀 SUBMIT FUNCTION
  // =========================
  const handleSubmit = async () => {

    if (!docType) {
      alert("Please select document type");
      return;
    }

    try {

      const formData = new FormData();

      // ===== BASIC FIELDS =====
      formData.append("doc_type_id", docType);
      formData.append("group_id", 1);
      formData.append("latitude", latitude);
      formData.append("longitude", longitude);
      formData.append("place_name", "Test Location");

      // ===== DETAILS =====
      formData.append("details", JSON.stringify(details));

      // ===== FILES =====
      files.forEach((file) => {
        formData.append("photos", file);
      });

      // ===== API CALL WITH PROGRESS =====
      const res = await API.post("/documents/upload", formData, {
        onUploadProgress: (event) => {
          const percent = Math.round(
            (event.loaded * 100) / event.total
          );
          setProgress(percent);
        },
      });

      alert("Upload successful!");
      console.log(res.data);

      // ===== RESET =====
      setFiles([]);
      setProgress(0);
      setLatitude("");
      setLongitude("");
      setDocType("");
      setDetails({});

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (err) {
      console.log(err.response);
      alert(err.response?.data?.message || "Upload failed");
    }
  };

  // =========================
  // 🧾 UI
  // =========================
  return (
    <div style={{ padding: 20 }}>

      <h2>Upload Document</h2>

      {/* ===== DOCUMENT TYPE ===== */}
      <select onChange={(e) => setDocType(e.target.value)}>
        <option value="">Select Document Type</option>
        <option value="1">Lorry Challan (LC)</option>
        <option value="2">Work Order (WO)</option>
        <option value="3">Consignment (CON)</option>
        <option value="4">POD</option>
        <option value="5">KYC Staff (KYCS)</option>
        <option value="6">KYC Vendor (KYCV)</option>
      </select>

      <br /><br />

{/* =====================================================
   🔁 DYNAMIC FORM SECTIONS (BASED ON DOCUMENT TYPE)
===================================================== */}

{/* =========================
   🚚 Lorry Challan (LC)
========================= */}
{docType === "1" && (
  <div>
    <h4>Lorry Challan Details</h4>

    <input
      placeholder="LC Number"
      onChange={(e) =>
        setDetails({ ...details, lc_no: e.target.value })
      }
    />

    <input
      placeholder="Reference Number"
      onChange={(e) =>
        setDetails({ ...details, ref_no: e.target.value })
      }
    />

    <input
      type="date"
      onChange={(e) =>
        setDetails({ ...details, lc_date: e.target.value })
      }
    />

    <input
      placeholder="Remarks"
      onChange={(e) =>
        setDetails({ ...details, remarks: e.target.value })
      }
    />
  </div>
)}

{/* =========================
   📄 Work Order (WO)
========================= */}
{docType === "2" && (
  <div>
    <h4>Work Order Details</h4>

    <input
      placeholder="Work Order Number"
      onChange={(e) =>
        setDetails({ ...details, wo_no: e.target.value })
      }
    />

    <input
      placeholder="Client Name"
      onChange={(e) =>
        setDetails({ ...details, client_name: e.target.value })
      }
    />

    <input
      placeholder="Site Location"
      onChange={(e) =>
        setDetails({ ...details, site: e.target.value })
      }
    />

    <input
      type="date"
      onChange={(e) =>
        setDetails({ ...details, wo_date: e.target.value })
      }
    />

    <input
      placeholder="Expense Amount"
      onChange={(e) =>
        setDetails({ ...details, expense: e.target.value })
      }
    />

    <input
      placeholder="GST Amount"
      onChange={(e) =>
        setDetails({ ...details, gst: e.target.value })
      }
    />

    <input
      placeholder="LOI Number"
      onChange={(e) =>
        setDetails({ ...details, loi: e.target.value })
      }
    />
  </div>
)}

{/* =========================
   📦 Consignment (CON)
========================= */}
{docType === "3" && (
  <div>
    <h4>Consignment Details</h4>

    <input
      placeholder="Consignment Number (CN No)"
      onChange={(e) =>
        setDetails({ ...details, cn_no: e.target.value })
      }
    />

    <input
      placeholder="Remarks"
      onChange={(e) =>
        setDetails({ ...details, remarks: e.target.value })
      }
    />
  </div>
)}

{/* =========================
   📄 POD (Proof of Delivery)
========================= */}
{docType === "4" && (
  <div>
    <h4>POD Details</h4>

    <input
      placeholder="Consignment Number (CN No)"
      onChange={(e) =>
        setDetails({ ...details, cn_no: e.target.value })
      }
    />

    <select
      onChange={(e) =>
        setDetails({ ...details, original_received: e.target.value })
      }
    >
      <option value="">Original Received?</option>
      <option value="YES">YES</option>
      <option value="NO">NO</option>
    </select>

    <input
      placeholder="Claim Amount"
      onChange={(e) =>
        setDetails({ ...details, claim_amount: e.target.value })
      }
    />

    <input
      placeholder="Extra Expense"
      onChange={(e) =>
        setDetails({ ...details, extra_expense: e.target.value })
      }
    />
  </div>
)}

{/* =========================
   👤 KYC Staff (KYCS)
========================= */}
{docType === "5" && (
  <div>
    <h4>KYC Staff Details</h4>

    <input
      placeholder="Full Name"
      onChange={(e) =>
        setDetails({ ...details, full_name: e.target.value })
      }
    />

    <input
      placeholder="PAN Number"
      onChange={(e) =>
        setDetails({ ...details, pan_no: e.target.value })
      }
    />

    <input
      placeholder="Aadhar Number"
      onChange={(e) =>
        setDetails({ ...details, aadhar_no: e.target.value })
      }
    />

    <input
      placeholder="Mobile Number"
      onChange={(e) =>
        setDetails({ ...details, mobile: e.target.value })
      }
    />

    <input
      placeholder="Bank Account Number"
      onChange={(e) =>
        setDetails({ ...details, bank_account_no: e.target.value })
      }
    />

    <input
      placeholder="IFSC Code"
      onChange={(e) =>
        setDetails({ ...details, bank_ifsc: e.target.value })
      }
    />

    <input
      placeholder="UPI ID"
      onChange={(e) =>
        setDetails({ ...details, upi_id: e.target.value })
      }
    />

    <input
      placeholder="Address"
      onChange={(e) =>
        setDetails({ ...details, full_address: e.target.value })
      }
    />
  </div>
)}

{/* =========================
   🏢 KYC Vendor (KYCV)
========================= */}
{docType === "6" && (
  <div>
    <h4>KYC Vendor Details</h4>

    <input
      placeholder="Vendor Type"
      onChange={(e) =>
        setDetails({ ...details, vendor_type: e.target.value })
      }
    />

    <input
      placeholder="Business Name"
      onChange={(e) =>
        setDetails({ ...details, business_name: e.target.value })
      }
    />

    <input
      placeholder="Authorized Person"
      onChange={(e) =>
        setDetails({ ...details, authorized_person: e.target.value })
      }
    />

    <input
      placeholder="Vendor Mobile"
      onChange={(e) =>
        setDetails({ ...details, vendor_mobile: e.target.value })
      }
    />

    <input
      placeholder="Email"
      onChange={(e) =>
        setDetails({ ...details, email: e.target.value })
      }
    />

    <input
      placeholder="Introducer Name"
      onChange={(e) =>
        setDetails({ ...details, introducer_name: e.target.value })
      }
    />

    <input
      placeholder="PAN Number"
      onChange={(e) =>
        setDetails({ ...details, pan_no: e.target.value })
      }
    />

    <input
      placeholder="Aadhar Number"
      onChange={(e) =>
        setDetails({ ...details, aadhar_no: e.target.value })
      }
    />

    <input
      placeholder="GST Number"
      onChange={(e) =>
        setDetails({ ...details, gst_no: e.target.value })
      }
    />

    <input
      placeholder="Bank Account Number"
      onChange={(e) =>
        setDetails({ ...details, bank_account_no: e.target.value })
      }
    />

    <input
      placeholder="IFSC Code"
      onChange={(e) =>
        setDetails({ ...details, bank_ifsc: e.target.value })
      }
    />

    <input
      placeholder="Bank Name"
      onChange={(e) =>
        setDetails({ ...details, bank_name: e.target.value })
      }
    />

    <input
      placeholder="Bank Branch"
      onChange={(e) =>
        setDetails({ ...details, bank_branch: e.target.value })
      }
    />

    <input
      placeholder="Remarks"
      onChange={(e) =>
        setDetails({ ...details, remarks: e.target.value })
      }
    />
  </div>
)}














      {/* ===== GPS ===== */}
      <button onClick={getLocation}>Get GPS</button>
      <p>Lat: {latitude}</p>
      <p>Lng: {longitude}</p>

      {/* ===== FILE INPUT ===== */}
      <input
        type="file"
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
      />

      <br /><br />

      {/* =========================
          🖼 IMAGE PREVIEW + REMOVE
      ========================= */}
      {files.length > 0 && (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>

          {files.map((file, index) => (
            <div key={index}>

              <img
                src={URL.createObjectURL(file)}
                alt="preview"
                width="100"
              />

              <p style={{ fontSize: "12px" }}>
                {file.name}
              </p>

              <button onClick={() => removeFile(index)}>
                ❌ Remove
              </button>

            </div>
          ))}

        </div>
      )}

      {/* =========================
          📊 PROGRESS BAR
      ========================= */}
      {progress > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ width: "100%", background: "#eee", height: 10 }}>
            <div
              style={{
                width: `${progress}%`,
                height: 10,
                background: "green",
              }}
            ></div>
          </div>
          <p>{progress}% uploaded</p>
        </div>
      )}

      <br />

      {/* ===== SUBMIT ===== */}
      <button onClick={handleSubmit}>Submit</button>

    </div>
  );
}