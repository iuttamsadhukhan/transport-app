import { useState, useRef } from "react";
import API from "../api/api";

export default function Upload() {

  // =========================
  // 🧠 STATES
  // =========================
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState(0);

  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [docType, setDocType] = useState("");
  const [details, setDetails] = useState({});

  const fileInputRef = useRef(null);

  // =========================
  // 📍 GPS LOCATION
  // =========================
  const getLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
    });
  };

  // =========================
  // 📸 FILE SELECT
  // =========================
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles]);
  };

  // =========================
  // ❌ REMOVE FILE
  // =========================
  const removeFile = (indexToRemove) => {
    setFiles(files.filter((_, index) => index !== indexToRemove));
  };

  // =========================
  // 🚀 SUBMIT
  // =========================
  const handleSubmit = async () => {

    // ===== BASIC VALIDATION =====
    if (!docType) {
      alert("Please select document type");
      return;
    }

    // ===== TYPE-WISE VALIDATION =====
    if (docType === "1" && !details.lc_no) {
      alert("LC Number required");
      return;
    }

    if (docType === "2" && !details.wo_no) {
      alert("Work Order Number required");
      return;
    }

    if (docType === "3" && !details.cn_no) {
      alert("Consignment Number required");
      return;
    }

    if (docType === "4" && !details.cn_no) {
      alert("CN Number required for POD");
      return;
    }

    if (docType === "5") {
      if (!details.full_name || !details.pan_no || !details.mobile) {
        alert("Full Name, PAN & Mobile required");
        return;
      }
    }

    if (docType === "6") {
      if (!details.business_name || !details.pan_no) {
        alert("Business Name & PAN required");
        return;
      }
    }

    try {
      const formData = new FormData();

      // ===== BASIC FIELDS =====
      formData.append("doc_type_id", docType);
      formData.append("group_id", 1);
      formData.append("latitude", latitude || null);
      formData.append("longitude", longitude || null);
      formData.append("place_name", "Test Location");

      // ===== DETAILS =====
      formData.append("details", JSON.stringify(details));

      // ===== FILES =====
      files.forEach((file) => {
        formData.append("photos", file);
      });

      // ===== API CALL =====
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
  // 🎨 UI
  // =========================
  return (
    <div style={{ padding: 20 }}>

      <h2>Upload Document</h2>

      {/* ===== DOCUMENT TYPE ===== */}
      <select onChange={(e) => {
        setDocType(e.target.value);
        setDetails({});
      }}>
        <option value="">Select Document Type</option>
        <option value="1">Lorry Challan (LC)</option>
        <option value="2">Work Order (WO)</option>
        <option value="3">Consignment (CON)</option>
        <option value="4">POD</option>
        <option value="5">KYC Staff (KYCS)</option>
        <option value="6">KYC Vendor (KYCV)</option>
      </select>

      <br /><br />

      {/* =========================
         🚚 LC
      ========================= */}
      {docType === "1" && (
        <div>
          <h4>Lorry Challan</h4>

          <input placeholder="LC No"
            onChange={(e) => setDetails({ ...details, lc_no: e.target.value })}
          />

          <input placeholder="Reference No"
            onChange={(e) => setDetails({ ...details, ref_no: e.target.value })}
          />

          <input type="date"
            onChange={(e) => setDetails({ ...details, lc_date: e.target.value })}
          />

          <input placeholder="Remarks"
            onChange={(e) => setDetails({ ...details, remarks: e.target.value })}
          />
        </div>
      )}

      {/* =========================
         📄 WO
      ========================= */}
      {docType === "2" && (
        <div>
          <h4>Work Order</h4>

          <input placeholder="WO No"
            onChange={(e) => setDetails({ ...details, wo_no: e.target.value })}
          />

          <input placeholder="Client"
            onChange={(e) => setDetails({ ...details, client_name: e.target.value })}
          />

          <input placeholder="Site"
            onChange={(e) => setDetails({ ...details, site: e.target.value })}
          />

          <input type="date"
            onChange={(e) => setDetails({ ...details, wo_date: e.target.value })}
          />

          <input placeholder="Expense"
            onChange={(e) => setDetails({ ...details, expense: e.target.value })}
          />

          <input placeholder="GST"
            onChange={(e) => setDetails({ ...details, gst: e.target.value })}
          />

          <input placeholder="LOI"
            onChange={(e) => setDetails({ ...details, loi: e.target.value })}
          />
        </div>
      )}

      {/* =========================
         📦 CON
      ========================= */}
      {docType === "3" && (
        <div>
          <h4>Consignment</h4>

          <input placeholder="CN No"
            onChange={(e) => setDetails({ ...details, cn_no: e.target.value })}
          />

          <input placeholder="Remarks"
            onChange={(e) => setDetails({ ...details, remarks: e.target.value })}
          />
        </div>
      )}

      {/* =========================
         📄 POD
      ========================= */}
      {docType === "4" && (
        <div>
          <h4>POD</h4>

          <input placeholder="CN No"
            onChange={(e) => setDetails({ ...details, cn_no: e.target.value })}
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

          <input placeholder="Claim"
            onChange={(e) => setDetails({ ...details, claim_amount: e.target.value })}
          />

          <input placeholder="Extra Expense"
            onChange={(e) => setDetails({ ...details, extra_expense: e.target.value })}
          />
        </div>
      )}

      {/* =========================
         👤 KYCS
      ========================= */}
      {docType === "5" && (
        <div>
          <h4>KYC Staff</h4>

          <input placeholder="Full Name"
            onChange={(e) => setDetails({ ...details, full_name: e.target.value })}
          />

          <input placeholder="PAN"
            onChange={(e) => setDetails({ ...details, pan_no: e.target.value })}
          />

          <input placeholder="Aadhar"
            onChange={(e) => setDetails({ ...details, aadhar_no: e.target.value })}
          />

          <input placeholder="Mobile"
            onChange={(e) => setDetails({ ...details, mobile: e.target.value })}
          />

          <input placeholder="Bank Acc"
            onChange={(e) => setDetails({ ...details, bank_account_no: e.target.value })}
          />

          <input placeholder="IFSC"
            onChange={(e) => setDetails({ ...details, bank_ifsc: e.target.value })}
          />

          <input placeholder="UPI"
            onChange={(e) => setDetails({ ...details, upi_id: e.target.value })}
          />

          <input placeholder="Address"
            onChange={(e) => setDetails({ ...details, full_address: e.target.value })}
          />
        </div>
      )}

      {/* =========================
         🏢 KYCV
      ========================= */}
      {docType === "6" && (
        <div>
          <h4>KYC Vendor</h4>

          <input placeholder="Vendor Type"
            onChange={(e) => setDetails({ ...details, vendor_type: e.target.value })}
          />

          <input placeholder="Business Name"
            onChange={(e) => setDetails({ ...details, business_name: e.target.value })}
          />

          <input placeholder="Authorized Person"
            onChange={(e) => setDetails({ ...details, authorized_person: e.target.value })}
          />

          <input placeholder="Mobile"
            onChange={(e) => setDetails({ ...details, vendor_mobile: e.target.value })}
          />

          <input placeholder="Email"
            onChange={(e) => setDetails({ ...details, email: e.target.value })}
          />

          <input placeholder="PAN"
            onChange={(e) => setDetails({ ...details, pan_no: e.target.value })}
          />
        </div>
      )}

      <br />

      {/* GPS */}
      <button onClick={getLocation}>Get GPS</button>
      <p>Lat: {latitude}</p>
      <p>Lng: {longitude}</p>

      {/* FILE INPUT */}
      <input type="file" multiple onChange={handleFileChange} ref={fileInputRef} />

      <br /><br />

      {/* PREVIEW */}
      {files.map((file, index) => (
        <div key={index}>
          <img src={URL.createObjectURL(file)} width="100" />
          <p>{file.name}</p>
          <button onClick={() => removeFile(index)}>Remove</button>
        </div>
      ))}

      {/* PROGRESS */}
      {progress > 0 && <p>{progress}% uploaded</p>}

      <br />

      <button onClick={handleSubmit}>Submit</button>

    </div>
  );
}