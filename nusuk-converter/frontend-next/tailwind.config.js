/** @type {import('tailwindcss').Config} */

// --- AJOUT : Importer les polices par défaut de Tailwind ---
const { fontFamily } = require('tailwindcss/defaultTheme');
// --- FIN AJOUT ---

module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // --- AJOUT : Définir la famille de polices 'sans' pour utiliser les variables CSS ---
      fontFamily: {
        sans: ['var(--font-inter)', 'var(--font-cairo)', ...fontFamily.sans],
      },
      // --- FIN AJOUT ---

      // Votre configuration de couleurs existante reste inchangée
      colors: {
        brand: {
          // Vert principal (utilisé pour les boutons et titres)
          green: '#249789',
          // Vert très sombre, presque noir (pour le texte principal)
          'text-primary': '#191919',
          // Gris moyen (pour le texte secondaire et les descriptions)
          'text-secondary': '#888888',
          // Fond principal du site (un gris très léger)
          background: '#f8f8f8',
          // Fond des cartes et conteneurs
          surface: '#ffffff',
          // Couleur des bordures
          border: '#eeeeee',
          // Accent doré/jaune
          gold: '#E3B45B'
        }
      }
    },
  },
  plugins: [require('@tailwindcss/typography'),],
};