// /nusuk-converter/frontend-next/next-i18next.config.js

/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    // MODIFIÉ : 'en' est maintenant la langue par défaut.
    defaultLocale: 'en',

    // La liste de toutes les langues supportées reste la même.
    locales: ['en', 'fr', 'ar', 'de', 'es', 'it', 'pt'],

    
  },

  reloadOnPrerender: process.env.NODE_ENV === 'development',
};