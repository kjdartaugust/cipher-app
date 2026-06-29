import path from 'node:path';

const sodiumWrappersCjs = path.join(
  process.cwd(),
  'node_modules/libsodium-wrappers/dist/modules/libsodium-wrappers.js'
);
const sodiumCjs = path.join(
  process.cwd(),
  'node_modules/libsodium/dist/modules/libsodium.js'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'api.dicebear.com' },
    ],
  },
  webpack: (config) => {
    // The published libsodium-wrappers ESM build has a broken relative import
    // (`./libsodium.mjs`). Force webpack to use the CommonJS build instead.
    config.resolve.alias = {
      ...config.resolve.alias,
      'libsodium-wrappers$': sodiumWrappersCjs,
      'libsodium$': sodiumCjs,
    };
    return config;
  },
};

export default nextConfig;
