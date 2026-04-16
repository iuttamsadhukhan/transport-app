import { useState } from "react";
import { sendOTP, verifyOTP } from "../api/auth";

export default function Login() {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);

  const handleSendOTP = async () => {
    try {
      await sendOTP(mobile);
      alert("OTP sent! Check backend terminal.");
      setStep(2);
    } catch (err) {
      alert(err.response?.data?.message || "Error sending OTP");
    }
  };

  const handleVerifyOTP = async () => {
    try {
      const res = await verifyOTP(mobile, otp);
      localStorage.setItem("token", res.data.token);
      alert("Login successful!");
      window.location.href = "/dashboard";
    } catch (err) {
      alert(err.response?.data?.message || "Error verifying OTP");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>

      {step === 1 && (
        <>
          <input
            placeholder="Mobile Number"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
          />
          <button onClick={handleSendOTP}>Send OTP</button>
        </>
      )}

      {step === 2 && (
        <>
          <input
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <button onClick={handleVerifyOTP}>Verify OTP</button>
        </>
      )}
    </div>
  );
}