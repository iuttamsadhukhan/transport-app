import API from "./api";

export const sendOTP = (mobile) =>
  API.post("/auth/send-otp", { mobile });

export const verifyOTP = (mobile, otp) =>
  API.post("/auth/verify-otp", { mobile, otp });