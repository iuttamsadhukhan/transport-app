import { useEffect, useState } from "react"; 
// useState → to store user data
// useEffect → to run code when page loads

import API from "../api/api"; 
// Import our axios instance (already configured with baseURL + token)

export default function Dashboard() {

  const [user, setUser] = useState(null); 
  // user → will store logged-in user data from backend
  // initially null because data not loaded yet

  useEffect(() => {

    const token = localStorage.getItem("token"); 
    // Get JWT token from browser storage

    if (!token) {
      // If token not found → user is not logged in

      window.location.href = "/"; 
      // Redirect user to login page

      return; 
      // VERY IMPORTANT → stops further execution
    }

    const fetchUser = async () => {
      // Function to fetch user details from backend

      try {
        const res = await API.get("/auth/me"); 
        // Call protected API → backend verifies token and returns user
        console.log(res.data); // 👈 ADD THIS
        setUser(res.data.user); 
        // Save user data into state → UI will update automatically

      } catch (err) {
        // If error occurs (invalid token / expired)

        alert("Session expired. Please login again."); 
        // Inform user

        localStorage.removeItem("token"); 
        // Remove invalid/expired token

        window.location.href = "/"; 
        // Redirect to login page
      }
    };

    fetchUser(); 
    // Call the function to load user data

  }, []); 
  // Empty dependency array → runs only once when page loads

  return (
    <div style={{ padding: 20 }}>
      <h2>Dashboard</h2>

      {user ? (
        // If user data is loaded

        <div>
          <p><b>Name:</b> {user.name}</p> 
          {/* Display user name */}

          <p><b>Mobile:</b> {user.mobile}</p> 
          {/* Display mobile number */}

          <p><b>Group ID:</b> {user.groupId}</p> 
          {/* Display group ID */}
          <br />

            {/* Upload Button */}
          <button onClick={() => window.location.href = "/upload"}>
             Upload Document
          </button>
        </div>

      ) : (
        // While data is loading

        <p>Loading...</p>
      )}
    </div>
  );
}