// frontend-next/src/pages/blog/[slug].js
import Head from 'next/head';
import Link from 'next/link';
import { getAllPostSlugs, getPostData } from '@/lib/posts';
import LanguageSwitcher from '@/components/LanguageSwitcher'; // Pour la cohérence

// Cette fonction s'exécute au moment du build pour chercher les données
export async function getStaticProps({ params }) {
  const postData = await getPostData(params.slug);
  return {
    props: {
      postData,
    },
  };
}

// Cette fonction s'exécute au moment du build pour connaître les URLs à générer
export async function getStaticPaths() {
  const paths = getAllPostSlugs();
  return {
    paths,
    fallback: false, // Si l'URL n'existe pas, renvoie une 404
  };
}

// C'est notre composant React pour la page de l'article
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