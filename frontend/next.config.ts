// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;
/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.100.10',  // 👈 thêm IP mạng nội bộ của bạn
    '*.local',
    "https://761aec78fd88.ngrok.app",         // 👈 nếu bạn dùng domain như myapp.local
  ],
}

module.exports = nextConfig

