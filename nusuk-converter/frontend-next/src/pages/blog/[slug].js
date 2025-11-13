// frontend-next/src/pages/blog/[slug].js
import Head from 'next/head';
import Link from 'next/link';
import { getAllPostSlugs, getPostData } from '@/lib/posts';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { i18n } from '../../../next-i18next.config.js';

// --- MODIFICATION : getStaticProps reçoit maintenant "locale" et le passe à getPostData ---
export async function getStaticProps({ params, locale }) {
  // On passe maintenant le slug ET la langue pour récupérer le bon fichier .md
  const postData = await getPostData(params.slug, locale);
  return {
    props: {
      postData,
    },
  };
}
// --- FIN DE LA MODIFICATION ---

// La fonction getStaticPaths que vous avez mise à jour est parfaite, elle reste inchangée.
export async function getStaticPaths() {
  const postSlugs = getAllPostSlugs();
  const locales = i18n.locales;

  const paths = [];
  
  postSlugs.forEach(slugObj => {
    locales.forEach(locale => {
      paths.push({
        params: { slug: slugObj.params.slug },
        locale: locale,
      });
    });
  });

  return {
    paths,
    fallback: false,
  };
}

// Le composant Post reste inchangé, il affiche simplement les données qu'on lui donne.
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