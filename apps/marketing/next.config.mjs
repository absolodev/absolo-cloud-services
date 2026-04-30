/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  // Transpile workspace packages so Next can consume their TS source
  // directly without us pre-building. (For prod publish we'll switch to
  // built dist/ outputs.)
  transpilePackages: ['@absolo/ui', '@absolo/icons', '@absolo/design-tokens'],
};

export default nextConfig;
