// frontend-next/src/pages/blog/[slug].js
import Head from 'next/head';
import Link from 'next/link';
import { getAllPostSlugs, getPostData } from '@/lib/posts';
import LanguageSwitcher from '@/components/LanguageSwitcher'; // Pour la cohérence
import { i18n } from '../../../next-i18next.config.js'; // --- MODIFICATION : Ajout de cet import ---

// Cette fonction s'exécute au moment du build pour chercher les données
export async function getStaticProps({ params }) {
  const postData = await getPostData(params.slug);
  return {
    props: {
      postData,
    },
  };
}

// --- MODIFICATION : La fonction getStaticPaths est maintenant consciente des langues ---
// Cette fonction s'exécute au moment du build pour connaître les URLs à générer
export async function getStaticPaths() {
  const postSlugs = getAllPostSlugs(); // Récupère [{ params: { slug: '...' } }, ...]
  const locales = i18n.locales; // Récupère ['en', 'fr', 'ar', ...]

  const paths = [];
  
  // Pour chaque slug d'article...
  postSlugs.forEach(slugObj => {
    // ...on crée un chemin pour chaque langue
    locales.forEach(locale => {
      paths.push({
        params: { slug: slugObj.params.slug },
        locale: locale, // On spécifie la langue pour ce chemin
      });
    });
  });

  return {
    paths, // Retourne la liste complète des chemins (slug x langue)
    fallback: false, // Si l'URL n'existe pas, renvoie une 404
  };
}
// --- FIN DE LA MODIFICATION ---

// C'est notre composant React pour la page de l'article (INCHANGÉ)
export default function Post({ postData }) {
  return (
    <>
      <Head>
        <title>{postData.title}</title>
        <meta name="description" content={postData.description} />
      </Head>

      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
        <LanguageSwitcher />
      </div>

      <main className="bg-brand-background min-h-screen py-16 px-4">
        <article className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-3xl md:text-4xl font-bold text-brand-text-primary mb-4">
            {postData.title}
          </h1>
          
          {/* Le contenu HTML de l'article est injecté ici */}
          <div 
            className="prose prose-lg prose-teal max-w-none"
            dangerouslySetInnerHTML={{ __html: postData.contentHtml }} 
          />

          <div className="mt-12 border-t pt-6">
            <Link href="/blog" legacyBehavior>
              <a className="text-brand-green hover:underline">
                &larr; Retour au blog
              </a>
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}