// src/components/LanguageSwitcher.js
import React, { useState, useRef, useEffect } from 'react'; // <-- MODIFICATION ICI
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

// Mapping des codes de langue à leur nom natif
const languageNames = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
  de: 'Deutsch',
  es: 'Español',
  it: 'Italiano',
  pt: 'Português',
};

const LanguageSwitcher = () => {
  const router = useRouter();
  const { locale: currentLocale, locales, pathname, query, asPath } = router;
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Gère le changement de langue
  const handleLocaleChange = (newLocale) => {
    setIsOpen(false);
    // next/router push pour changer de locale tout en gardant la même page
    router.push({ pathname, query }, asPath, { locale: newLocale });
  };

  // Gère la fermeture du dropdown si on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div>
        <button
          type="button"
          className="inline-flex items-center justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          {/* Icône Globe */}
          <svg className="w-5 h-5 mr-2 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h10a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.737 16.95l.01-.01M16.263 16.95l.01-.01M12 21a9 9 0 100-18 9 9 0 000 18z" />
          </svg>
          {currentLocale.toUpperCase()}
          {/* Icône Chevron */}
          <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1" role="none">
            {locales.map((locale) => {
              // On vérifie que la langue est définie dans notre mapping
              if (!languageNames[locale]) return null;

              return (
                <a
                  key={locale}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handleLocaleChange(locale);
                  }}
                  className={`block px-4 py-2 text-sm ${
                    currentLocale === locale
                      ? 'bg-gray-100 text-gray-900 font-bold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  role="menuitem"
                >
                  {languageNames[locale]}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;