// frontend-next/src/pages/_app.js

import '@/styles/globals.css';
import 'react-image-crop/dist/ReactCrop.css';
import { appWithTranslation } from 'next-i18next';

// --- MODIFICATION : Importer Cairo, et useRouter ---
import { Inter, Cairo } from 'next/font/google';
import { useRouter } from 'next/router';
// --- FIN MODIFICATION ---


// --- MODIFICATION : Configurer les deux polices avec des variables CSS ---
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter', // On assigne la police à une variable CSS
});

const cairo = Cairo({
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-cairo', // On assigne la police arabe à une autre variable CSS
});
// --- FIN MODIFICATION ---


function App({ Component, pageProps }) {
  // --- AJOUT : Logique pour choisir la classe de police en fonction de la langue ---
  const router = useRouter();
  const fontClassName = router.locale === 'ar' ? cairo.variable : inter.variable;
  // --- FIN AJOUT ---

  return (
    // --- MODIFICATION : Appliquer dynamiquement les classes de police ---
    // On définit les deux variables, et on applique la bonne classe principale + la classe de base 'font-sans'
    <main className={`${fontClassName} ${inter.variable} ${cairo.variable} font-sans`}>
      <Component {...pageProps} />
    </main>
    // --- FIN MODIFICATION ---
  );
}

export default appWithTranslation(App);