// frontend-next/scripts/generate-sitemap.js
const fs = require('fs');
const path = require('path');
const { i18n } = require('../next-i18next.config.js');

const SITE_URL = 'https://pilgrimdocs.app';
const postsDirectory = path.join(process.cwd(), '_posts');

// 1. Pages statiques
const staticPages = ['', 'converter', 'blog']; // J'ai ajouté 'blog'

// 2. Récupérer les articles de blog
const fileNames = fs.readdirSync(postsDirectory);
const blogPosts = fileNames
  .filter(fileName => fileName.endsWith('.md'))
  .map(fileName => {
    // Format attendu: slug.lang.md (ex: guide-photo.fr.md)
    const match = fileName.match(/^(.*)\.(fr|en|de|es|it|pt|ar)\.md$/);
    return match ? { slug: match[1], lang: match[2] } : null;
  })
  .filter(Boolean);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:xhtml="http://www.w3.org/1999/xhtml">
    
    <!-- Pages Statiques -->
    ${staticPages.map((page) => {
      return i18n.locales.map((locale) => {
        const route = page === '' ? '' : `/${page}`;
        const localePath = locale === i18n.defaultLocale ? '' : `/${locale}`;
        const url = `${SITE_URL}${localePath}${route}`;
        return `
          <url>
            <loc>${url}</loc>
            <changefreq>daily</changefreq>
            <priority>${page === '' ? '1.0' : '0.8'}</priority>
          </url>`;
      }).join('');
    }).join('')}

    <!-- Articles de Blog -->
    ${blogPosts.map((post) => {
      const localePath = post.lang === i18n.defaultLocale ? '' : `/${post.lang}`;
      const url = `${SITE_URL}${localePath}/blog/${post.slug}`;
      return `
        <url>
          <loc>${url}</loc>
          <changefreq>weekly</changefreq>
          <priority>0.7</priority>
        </url>`;
    }).join('')}
  </urlset>
`;

fs.writeFileSync(path.resolve(__dirname, '../public/sitemap.xml'), sitemap);
console.log('✅ Sitemap complet généré avec succès !');