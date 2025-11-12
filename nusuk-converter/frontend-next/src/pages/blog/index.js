// frontend-next/src/pages/blog/index.js
import Head from 'next/head';
import Link from 'next/link';
import { getSortedPostsData } from '@/lib/posts';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export async function getStaticProps() {
  const allPostsData = getSortedPostsData();
  return {
    props: {
      allPostsData,
    },
  };
}

export default function BlogHome({ allPostsData }) {
  return (
    <>
      <Head>
        <title>Blog - Pilgrim Docs</title>
        <meta name="description" content="Conseils et guides pour préparer vos documents pour le Hajj et la Omra avec l'application Nusuk." />
      </Head>

      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
        <LanguageSwitcher />
      </div>

      <main className="bg-brand-background min-h-screen py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold text-brand-green">Le Blog Pilgrim Docs</h1>
            <p className="mt-2 text-lg text-brand-text-secondary">
              Nos conseils pour un pèlerinage sans tracas administratifs.
            </p>
          </header>

          <div className="space-y-8">
            {allPostsData.map(({ slug, title, description }) => (
              <Link href={`/blog/${slug}`} key={slug} legacyBehavior>
                <a className="block bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-shadow">
                  <h2 className="text-2xl font-bold text-brand-text-primary">{title}</h2>
                  <p className="mt-2 text-brand-text-secondary">{description}</p>
                </a>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}