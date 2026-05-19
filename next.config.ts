import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;

const { withSentryConfig } = require("@sentry/nextjs");
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: "remlo",       // replace with your Sentry org
  project: "REMLO",             // replace with your Sentry project
});