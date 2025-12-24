// frontend-next/src/lib/posts.js
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const postsDirectory = path.join(process.cwd(), '_posts');

// Cette fonction reste inchangée, elle sert à lister les articles sur la page d'accueil du blog
export function getSortedPostsData({ locale }) {
  const fileNames = fs.readdirSync(postsDirectory);
  
  const allPostsData = fileNames
    // On ne garde que les fichiers de la bonne langue
    .filter((fileName) => fileName.endsWith(`.${locale}.md`))
    .map((fileName) => {
      // Le slug est le nom du fichier SANS la partie ".fr.md"
      const slug = fileName.replace(new RegExp(`\\.${locale}\\.md$`), '');

      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const matterResult = matter(fileContents);

      return {
        slug,
        ...matterResult.data,
      };
    });

  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// --- MODIFICATION MAJEURE ICI ---
// Au lieu de retourner juste les slugs, on retourne les chemins complets (slug + locale)
// Cela permet d'avoir des URLs différentes selon la langue (ex: /fr/guide-exigences... et /en/guide-requirements...)
export function getAllPostPaths() {
  const fileNames = fs.readdirSync(postsDirectory);

  const paths = fileNames.map((fileName) => {
    // Regex pour capturer le slug (groupe 1) et la langue (groupe 2)
    // Ex: "mon-article.fr.md" -> slug="mon-article", locale="fr"
    const match = fileName.match(/^(.*)\.(fr|en|de|es|it|pt|ar)\.md$/);
    
    if (match) {
      return {
        params: {
          slug: match[1],
        },
        locale: match[2],
      };
    }
    return null;
  }).filter(Boolean); // Supprime les fichiers qui ne correspondent pas au format

  return paths;
}

// Cette fonction reste inchangée
export async function getPostData(slug, locale) {
  const fullPath = path.join(postsDirectory, `${slug}.${locale}.md`);
  
  // Sécurité : vérifier si le fichier existe avant de lire (évite le crash ENOENT si jamais)
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Le fichier ${fullPath} n'existe pas.`);
  }

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