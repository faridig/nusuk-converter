// nusuk-converter/frontend-next/next.config.js

const { i18n } = require('./next-i18next.config.js');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  i18n,

  // --- AJOUTEZ CETTE SECTION ---
  // Elle indique à Next.js de rediriger toutes les requêtes commençant
  // par /api-proxy vers votre backend Flask.
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        destination: 'http://127.0.0.1:5001/api/:path*',
      },
    ];
  },
  // --- FIN DE L'AJOUT ---
};

module.exports = nextConfig;