// frontend-next/lib/posts.js
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

// Le chemin vers le dossier où nous stockons nos articles
const postsDirectory = path.join(process.cwd(), '_posts');

export function getSortedPostsData() {
  // Obtenir les noms de fichiers sous /_posts
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames.map((fileName) => {
    // Retirer ".md" du nom de fichier pour obtenir le slug
    const slug = fileName.replace(/\.md$/, '');

    // Lire le fichier markdown comme une chaîne de caractères
    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, 'utf8');

    // Utiliser gray-matter pour parser les métadonnées
    const matterResult = matter(fileContents);

    // Combiner les données avec le slug
    return {
      slug,
      ...matterResult.data,
    };
  });

  // Trier les articles par date (si vous ajoutez une date dans le frontmatter plus tard)
  return allPostsData.sort((a, b) => {
    if (a.date < b.date) {
      return 1;
    } else {
      return -1;
    }
  });
}

export function getAllPostSlugs() {
  const fileNames = fs.readdirSync(postsDirectory);
  return fileNames.map((fileName) => {
    return {
      params: {
        slug: fileName.replace(/\.md$/, ''),
      },
    };
  });
}

export async function getPostData(slug) {
  const fullPath = path.join(postsDirectory, `${slug}.md`);
  const fileContents = fs.readFileSync(fullPath, 'utf8');

  // Utiliser gray-matter pour parser les métadonnées
  const matterResult = matter(fileContents);

  // Utiliser remark pour convertir le markdown en HTML
  const processedContent = await remark()
    .use(html)
    .process(matterResult.content);
  const contentHtml = processedContent.toString();

  // Combiner les données avec le slug et le contenu HTML
  return {
    slug,
    contentHtml,
    ...matterResult.data,
  };
}