/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable standalone output for Electron
    output: 'standalone',

    // Disable image optimization for Electron (uses local files)
    images: {
        unoptimized: true,
    },

    // Webpack configuration
    webpack: (config, { isServer }) => {
        // Fixes npm packages that depend on node modules
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
            };
        }
        return config;
    },
};

export default nextConfig;
