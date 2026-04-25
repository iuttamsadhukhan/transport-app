import { useEffect, useState } from "react";
import API from "../api/api";

export default function Dashboard() {

  // =========================
  // 📦 STATE (ONLY ONCE)
  // =========================
  const [documents, setDocuments] = useState([]);
  const [user, setUser] = useState(null);

  // =========================
  // 📥 FETCH DOCUMENTS
  // =========================
  const fetchDocuments = async () => {
    try {
      const res = await API.get("/documents");
      setDocuments(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  // =========================
  // 👤 FETCH USER + DOCUMENTS
  // =========================
  useEffect(() => {

    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = "/";
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await API.get("/auth/me");
        setUser(res.data.user);
      } catch (err) {
        alert("Session expired. Please login again.");
        localStorage.removeItem("token");
        window.location.href = "/";
      }
    };

    fetchUser();        // get user
    fetchDocuments();   // get documents

  }, []);

  // =========================
  // 🎨 UI
  // =========================
  return (
    <div style={{ padding: 20 }}>
      <h2>Dashboard</h2>

      {user ? (
        <div>
          <p><b>Name:</b> {user.name}</p>
          <p><b>Mobile:</b> {user.mobile}</p>
          <p><b>Group ID:</b> {user.groupId}</p>

          <br />

          <button onClick={() => window.location.href = "/upload"}>
            Upload Document
          </button>

          {/* =========================
              📄 DOCUMENT LIST
          ========================= */}
          <h3>Uploaded Documents</h3>

          {documents.length === 0 ? (
            <p>No documents found</p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  border: "1px solid #ccc",
                  padding: "10px",
                  margin: "10px 0",
                }}
              >
                <p><b>ID:</b> {doc.id}</p>
                <p><b>Type:</b> {doc.doc_type_id}</p>
                <p><b>Date:</b> {doc.created_at}</p>
              </div>
            ))
          )}

        </div>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}