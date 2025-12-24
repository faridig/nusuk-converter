// frontend-next/src/pages/blog/[slug].js
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router'; // --- AJOUT : Nécessaire pour l'URL canonique
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

// La fonction getStaticPaths reste inchangée.
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

export default function Post({ postData }) {
  // --- AJOUT SEO : Logique pour l'URL canonique et le Schema ---
  const router = useRouter();
  const siteUrl = 'https://pilgrimdocs.app';
  
  // Construction de l'URL canonique propre (sans paramètres de requête)
  const currentPath = router.asPath.split('?')[0];
  const canonicalUrl = `${siteUrl}${router.locale === 'en' ? '' : `/${router.locale}`}${currentPath}`;
  
  // Image par défaut si l'article n'en a pas (à adapter selon tes assets)
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
    datePublished: postData.date, // Assure-toi d'avoir une date dans le frontmatter de tes .md
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
  // --- FIN AJOUT SEO ---

  return (
    <>
      <Head>
        <title>{postData.title} - Pilgrim Docs</title>
        <meta name="description" content={postData.description} />
        
        {/* Balise Canonique (Crucial pour le SEO multilingue) */}
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
          
          {/* Si tu as une date dans tes fichiers MD, c'est bien de l'afficher */}
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