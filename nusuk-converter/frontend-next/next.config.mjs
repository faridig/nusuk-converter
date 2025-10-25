// frontend-next/next.config.mjs

// 1. Importez tout l'objet exporté comme un "default" import
import i18nextConfig from './next-i18next.config.js';

// 2. Extrayez la propriété `i18n` de cet objet
const { i18n } = i18nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 3. Utilisez la variable i18n comme avant
  i18n,
};

export default nextConfig;