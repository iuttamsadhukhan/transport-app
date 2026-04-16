import { useState } from "react";
import API from "../api/api";

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // Capture GPS
  const getLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLatitude(pos.coords.latitude);
      setLongitude(pos.coords.longitude);
    });
  };

  // Handle file selection
  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  // Submit form
  const handleSubmit = async () => {
    try {
      const formData = new FormData();

      formData.append("doc_type_id", 1); // TEMP (we will make dynamic later)
      formData.append("group_id", 1);
      formData.append("latitude", latitude);
      formData.append("longitude", longitude);
      formData.append("place_name", "Test Location");

      // details JSON (empty for now)
      formData.append("details", JSON.stringify({}));

      // append files
      for (let i = 0; i < files.length; i++) {
        formData.append("photos", files[i]);
      }

      const res = await API.post("/documents/upload", formData);

      alert("Upload successful!");
      console.log(res.data);

    } catch (err) {
      alert(err.response?.data?.message || "Upload failed");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload Document</h2>

      <button onClick={getLocation}>Get GPS</button>
      <p>Lat: {latitude}</p>
      <p>Lng: {longitude}</p>

      <input type="file" multiple onChange={handleFileChange} />

      <br /><br />

      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}