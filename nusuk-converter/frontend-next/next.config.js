// nusuk-converter/frontend-next/next.config.js

const { i18n } = require('./next-i18next.config.js');

// On récupère l'URL de l'API depuis les variables d'environnement.
// S'il n'est pas défini, on utilise l'URL locale par défaut.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  i18n,

  // --- MODIFICATION APPLIQUÉE CI-DESSOUS ---
  async rewrites() {
    return [
      {
        source: '/api-proxy/:path*',
        // La destination est maintenant dynamique
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
  // --- FIN DE LA MODIFICATION ---
};

module.exports = nextConfig;