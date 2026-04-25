import { useEffect, useState } from "react";
import API from "../api/api";

export default function Documents() {

  const [docs, setDocs] = useState([]);

  // =========================
  // 📥 FETCH DOCUMENTS
  // =========================
  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const res = await API.get("/documents");
      setDocs(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Uploaded Documents</h2>

      {docs.map((doc) => (
        <div key={doc.id} style={{ border: "1px solid #ccc", margin: 10, padding: 10 }}>
          
          <p><b>ID:</b> {doc.id}</p>
          <p><b>Type:</b> {doc.doc_type_id}</p>
          <p><b>Date:</b> {doc.created_at}</p>

        </div>
      ))}

    </div>
  );
}