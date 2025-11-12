// frontend-next/src/pages/index.js
import Link from 'next/link';
import Head from 'next/head';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.917L12 23l9-2.083a12.02 12.02 0 00-2.382-9.981z" />
  </svg>
);

const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-brand-green mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
);
const CropIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-brand-green mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.629,18.628 L18.629,18.628 L18.629,7.628 M5.371,16.371 L5.371,5.371 L16.371,5.371" /></svg>
);
const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-brand-green mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
);


export default function HomePage() {
  const { t } = useTranslation('common');

  return (
    <>
      <Head>
        <title>{t('home.metaTitle')}</title>
        <meta
          name="description"
          content={t('home.metaDescription')}
        />
        {/* Vous avez correctement ajouté les données structurées ici */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'Pilgrim Docs',
              applicationCategory: 'Utilities',
              operatingSystem: 'Web',
              description: t('home.metaDescription'),
              offers: {
                '@type': 'Offer',
                price: '1.20',
                priceCurrency: 'EUR',
              },
            }),
          }}
        />
      </Head>
      <div className="bg-brand-background min-h-screen flex flex-col items-center justify-between font-sans text-brand-text-primary">
        
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
          <LanguageSwitcher />
        </div>

        <div className="w-full">
          <div className="text-center p-6 md:p-10 max-w-4xl mx-auto mt-20 md:mt-12">
            <header className="mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-brand-green mb-4">
                {t('home.title')}
              </h1>
              <p className="mt-4 text-lg md:text-xl text-brand-text-secondary max-w-2xl mx-auto">
                {t('home.subtitle')}
              </p>
            </header>

            <main>
              <Link href="/converter" legacyBehavior>
                <a className="inline-block bg-brand-green text-white font-bold text-xl px-12 py-4 rounded-lg shadow-md hover:bg-opacity-90 transition-all transform hover:scale-105">
                  {t('home.cta')}
                </a>
              </Link>

              <div className="mt-20 text-left grid md:grid-cols-3 gap-8">
                <div className="p-6 bg-brand-surface rounded-lg shadow-sm border border-brand-border transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <UploadIcon />
                  <h3 className="text-xl font-semibold text-brand-green mb-2">{t('home.step1_title')}</h3>
                  <p className="text-brand-text-secondary">
                    {t('home.step1_desc')}
                  </p>
                </div>
                <div className="p-6 bg-brand-surface rounded-lg shadow-sm border border-brand-border transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <CropIcon />
                  <h3 className="text-xl font-semibold text-brand-green mb-2">{t('home.step2_title')}</h3>
                  <p className="text-brand-text-secondary">
                    {t('home.step2_desc')}
                  </p>
                </div>
                <div className="p-6 bg-brand-surface rounded-lg shadow-sm border border-brand-border transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                  <DownloadIcon />
                  <h3 className="text-xl font-semibold text-brand-green mb-2">{t('home.step3_title')}</h3>
                  <p className="text-brand-text-secondary">
                    {t('home.step3_desc')}
                  </p>
                </div>
              </div>
            </main>
          </div>

          <section className="w-full bg-white border-t border-b border-gray-100 py-16 mt-24">
              <div className="text-center max-w-2xl mx-auto px-6">
                  <h2 className="text-3xl font-bold text-brand-text-primary">
                      {t('home.contact_title')}
                  </h2>
                  <p className="mt-2 text-lg text-brand-text-secondary">
                      {t('home.contact_subtitle')}
                  </p>
                  <div className="mt-8">
                      <a 
                          href="mailto:pilgrimdocs@proton.me" 
                          className="inline-flex items-center justify-center bg-white hover:bg-green-50 text-brand-green font-semibold px-6 py-3 rounded-lg shadow-sm transition-colors border border-brand-green"
                      >
                          <MailIcon />
                          <span>{t('home.contact_cta')}</span>
                      </a>
                  </div>
              </div>
          </section>
        </div>

        {/* --- MODIFICATION : Ajout du lien vers le blog dans le footer --- */}
        <footer className="py-8 w-full flex justify-center items-center space-x-8">
          <Link href="/blog" legacyBehavior>
              <a className="text-brand-text-secondary hover:text-brand-green hover:underline">Blog</a>
          </Link>
          <div className="inline-flex items-center gap-2 rounded-lg border border-green-200 bg-green-50/60 p-3 text-sm text-green-800 font-medium">
            <ShieldIcon />
            <span>{t('home.footer_privacy')}</span>
          </div>
        </footer>
        {/* --- FIN DE LA MODIFICATION --- */}
        
      </div>
    </>
  );
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}