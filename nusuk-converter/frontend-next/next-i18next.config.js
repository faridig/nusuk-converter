// /nusuk-converter/frontend-next/next-i18next.config.js

/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    // MODIFIÉ : 'en' est maintenant la langue par défaut.
    defaultLocale: 'en',

    // La liste de toutes les langues supportées reste la même.
    locales: ['en', 'fr', 'ar', 'de', 'es', 'it', 'pt'],

    // La détection de la langue reste activée, ce qui est une bonne pratique.
    localeDetection: true,
  },

  reloadOnPrerender: process.env.NODE_ENV === 'development',
};