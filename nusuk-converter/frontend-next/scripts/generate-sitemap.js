// frontend-next/scripts/generate-sitemap.js
const fs = require('fs');
const path = require('path');
const { i18n } = require('../next-i18next.config.js');

const SITE_URL = 'https://pilgrimdocs.app';

// Les pages statiques de votre site
const pages = ['/', '/converter'];

// Récupérer les locales (langues) depuis votre configuration
const locales = i18n.locales;

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:xhtml="http://www.w3.org/1999/xhtml">
    ${pages
      .map((page) => {
        // Pour chaque page, on crée une entrée pour chaque langue
        const route = page === '/' ? '' : page;

        // La première entrée est la langue par défaut (en)
        const defaultUrl = `${SITE_URL}${route}`;

        // On génère les liens alternatifs pour les autres langues
        const alternateLinks = locales
          .map(
            (locale) =>
              `  <xhtml:link
                  rel="alternate"
                  hreflang="${locale}"
                  href="${SITE_URL}/${locale}${route}"/>`
          )
          .join('\n');

        return `
          <url>
            <loc>${defaultUrl}</loc>
            ${alternateLinks}
          </url>
        `;
      })
      .join('')}
  </urlset>
`;

// Écrit le sitemap dans le dossier `public`
fs.writeFileSync(path.resolve(__dirname, '../public/sitemap.xml'), sitemap);

console.log('✅ Sitemap généré avec succès !');