// frontend-next/src/pages/blog/[slug].js
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
// --- MODIFICATION : On importe getAllPostPaths au lieu de getAllPostSlugs
import { getAllPostPaths, getPostData } from '@/lib/posts';
import LanguageSwitcher from '@/components/LanguageSwitcher';
// --- AJOUT : Nécessaire pour que le LanguageSwitcher fonctionne
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';

export async function getStaticProps({ params, locale }) {
  try {
    const postData = await getPostData(params.slug, locale);
    return {
      props: {
        postData,
        // On charge les traductions pour le composant LanguageSwitcher
        ...(await serverSideTranslations(locale, ['common'])),
      },
    };
  } catch (error) {
    // Si le fichier n'existe pas (cas rare grâce à getStaticPaths), on renvoie 404
    return {
      notFound: true,
    };
  }
}

// --- MODIFICATION MAJEURE : Correction de l'erreur de build ---
export async function getStaticPaths() {
  // On récupère directement les chemins valides (slug + locale) depuis le fichier lib
  // Cela évite de générer des pages anglaises avec des slugs français qui n'existent pas
  const paths = getAllPostPaths();

  return {
    paths,
    fallback: false,
  };
}

export default function Post({ postData }) {
  const router = useRouter();
  const siteUrl = 'https://pilgrimdocs.app';
  
  // Construction de l'URL canonique propre (sans paramètres de requête)
  const currentPath = router.asPath.split('?')[0];
  const canonicalUrl = `${siteUrl}${router.locale === 'en' ? '' : `/${router.locale}`}${currentPath}`;
  
  // Image par défaut si l'article n'en a pas
  const ogImage = postData.image 
    ? `${siteUrl}${postData.image}` 
    : `${siteUrl}/images/og-default.jpg`;

  // Données structurées pour Google (Article de blog)
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: postData.title,
    description: postData.description,
    image: ogImage,
    datePublished: postData.date,
    author: {
      '@type': 'Organization',
      name: 'Pilgrim Docs',
      url: siteUrl
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl
    }
  };

  return (
    <>
      <Head>
        <title>{postData.title} - Pilgrim Docs</title>
        <meta name="description" content={postData.description} />
        
        {/* Balise Canonique */}
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph / Facebook / WhatsApp */}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={postData.title} />
        <meta property="og:description" content={postData.description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="Pilgrim Docs" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={postData.title} />
        <meta name="twitter:description" content={postData.description} />
        <meta name="twitter:image" content={ogImage} />

        {/* Données structurées JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
      </Head>

      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
        <LanguageSwitcher />
      </div>

      <main className="bg-brand-background min-h-screen py-16 px-4">
        <article className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-3xl md:text-4xl font-bold text-brand-text-primary mb-4">
            {postData.title}
          </h1>
          
          {postData.date && (
            <p className="text-gray-500 text-sm mb-6">
              {new Date(postData.date).toLocaleDateString(router.locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          )}

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