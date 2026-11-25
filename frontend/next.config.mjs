// The website calls the API through /api/... on its own address, so the sign-in cookie works without cross-site rules.
const API = process.env.API_URL || "http://localhost:8000";

// Basic protection headers on every page.
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },                       // no one can show JobsQ inside their page (clickjacking)
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API}/:path*` }];
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};
