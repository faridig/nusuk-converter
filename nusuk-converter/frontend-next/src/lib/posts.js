// frontend-next/src/lib/posts.js
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const postsDirectory = path.join(process.cwd(), '_posts');

// --- MODIFICATION 1 : La fonction accepte maintenant un objet avec la "locale" (langue) ---
export function getSortedPostsData({ locale }) {
  const fileNames = fs.readdirSync(postsDirectory);
  
  const allPostsData = fileNames
    // --- On ne garde que les fichiers de la bonne langue ---
    .filter((fileName) => fileName.endsWith(`.${locale}.md`))
    .map((fileName) => {
      // Le slug est maintenant le nom du fichier SANS la partie ".fr.md" ou ".de.md"
      const slug = fileName.replace(new RegExp(`\\.${locale}\\.md$`), '');

      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const matterResult = matter(fileContents);

      return {
        slug,
        ...matterResult.data,
      };
    });

  // Tri par date (si vous en ajoutez une)
  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// --- MODIFICATION 2 : Cette fonction doit retourner des slugs UNIQUES ---
export function getAllPostSlugs() {
  const fileNames = fs.readdirSync(postsDirectory);

  // On extrait les slugs de base (sans la langue) et on supprime les doublons
  const slugs = fileNames.map((fileName) =>
    fileName.replace(/\.(fr|en|de|es|it|pt|ar)\.md$/, '')
  );
  const uniqueSlugs = [...new Set(slugs)];

  return uniqueSlugs.map((slug) => {
    return {
      params: {
        slug: slug,
      },
    };
  });
}

// --- MODIFICATION 3 : La fonction a besoin de la langue pour trouver le bon fichier ---
export async function getPostData(slug, locale) {
  // On construit le nom de fichier complet, ex: "guide-exigences-photo-nusuk.fr.md"
  const fullPath = path.join(postsDirectory, `${slug}.${locale}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');

  const matterResult = matter(fileContents);

  const processedContent = await remark()
    .use(html)
    .process(matterResult.content);
  const contentHtml = processedContent.toString();

  return {
    slug,
    contentHtml,
    ...matterResult.data,
  };
}