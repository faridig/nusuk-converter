// src/components/SeoHead.js
import Head from 'next/head';
import { useRouter } from 'next/router';

const SITE_URL = 'https://pilgrimdocs.app';

const SeoHead = ({ title, description, image, schemaJson }) => {
  const router = useRouter();
  
  // Gestion de l'URL canonique (très important pour le SEO multilingue)
  // Si on est en 'fr', l'URL est /fr/page, sinon juste /page pour la langue par défaut
  const currentPath = router.asPath.split('?')[0];
  const canonicalUrl = `${SITE_URL}${router.locale === 'en' ? '' : `/${router.locale}`}${currentPath === '/' ? '' : currentPath}`;

  const metaImage = image ? `${SITE_URL}${image}` : `${SITE_URL}/images/og-default.jpg`; // Assure-toi d'avoir une image par défaut

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph / Facebook / WhatsApp */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:site_name" content="Pilgrim Docs" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={metaImage} />

      {/* Données structurées JSON-LD */}
      {schemaJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaJson) }}
        />
      )}
    </Head>
  );
};

export default SeoHead;