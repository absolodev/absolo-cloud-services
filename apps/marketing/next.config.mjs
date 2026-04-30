/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // typedRoutes is intentionally OFF while the marketing site is mostly
  // scaffolded copy with placeholder hrefs (e.g. `/docs/get-started`,
  // `/changelog`, `/about`) for pages that don't exist yet. Re-enable as a
  // top-level option (`typedRoutes: true`) once those pages land.
  typedRoutes: false,
  // Transpile workspace packages so Next can consume their TS source
  // directly without us pre-building. (For prod publish we'll switch to
  // built dist/ outputs.)
  transpilePackages: ['@absolo/ui', '@absolo/icons', '@absolo/design-tokens'],
};

export default nextConfig;
