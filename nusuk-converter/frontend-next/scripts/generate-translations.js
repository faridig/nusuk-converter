// frontend-next/scripts/generate-translations.js

const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

// --- CONFIGURATION ---
const locales = ['en', 'fr', 'es', 'pt', 'it', 'de', 'ar'];
const defaultLocale = 'fr'; // Changez pour 'en' si vous préférez l'anglais par défaut
const sourceFiles = [
  'src/pages/index.js',
  'src/pages/converter.js',
];
const outputDir = 'public/locales';
// -------------------

console.log('🔍 Démarrage de l\'extraction des chaînes de caractères...');

const extractedStrings = new Set();

// Fonction pour générer une clé lisible à partir d'un texte
const generateKey = (text) => {
  return text
    .toLowerCase()
    .replace(/['’]/g, '') // Supprime les apostrophes
    .replace(/[^a-z0-9\s€]/g, '') // Garde les lettres, chiffres, espaces et le symbole euro
    .trim()
    .replace(/\s+/g, '_') // Remplace les espaces par des underscores
    .substring(0, 50); // Limite la longueur
};

// Parcourt les fichiers sources pour extraire le texte
sourceFiles.forEach(filePath => {
  console.log(`- Analyse du fichier : ${filePath}`);
  const absolutePath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
      console.warn(`  ⚠️ Fichier non trouvé : ${absolutePath}`);
      return;
  }
  const code = fs.readFileSync(absolutePath, 'utf-8');

  const ast = babelParser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx'],
  });

  traverse(ast, {
    // Extrait le texte des éléments JSX, ex: <p>Mon texte</p>
    JSXText(path) {
      const text = path.node.value.trim();
      if (text) {
        extractedStrings.add(text);
      }
    },
    // Extrait le texte des attributs, ex: alt="Mon texte"
    StringLiteral(path) {
      // On évite les chemins, les noms de classe, etc.
      // On se concentre sur les chaînes dans des contextes pertinents
      if (
        (path.parent.type === 'JSXAttribute' && ['alt', 'aria-label', 'placeholder', 'title'].includes(path.parent.name.name)) ||
        (path.parent.type === 'JSXExpressionContainer' && path.parentPath.parent.type === 'JSXElement') ||
        (path.parent.type === 'CallExpression' && path.parent.callee.name === 'setError')
      ) {
        const text = path.node.value.trim();
        if (text && text.length > 1 && text.includes(' ')) { // Simple heuristique pour ne garder que les phrases
          extractedStrings.add(text);
        }
      }
    },
  });
});

console.log(`\n✅ ${extractedStrings.size} chaînes uniques extraites.`);

// Crée le dictionnaire de base (pour la langue par défaut)
const defaultTranslations = {};
extractedStrings.forEach(text => {
  const key = generateKey(text);
  if (key) {
    defaultTranslations[key] = text;
  }
});

// Crée les dossiers et les fichiers de traduction
fs.mkdirSync(outputDir, { recursive: true });

locales.forEach(locale => {
  const localeDir = path.join(outputDir, locale);
  fs.mkdirSync(localeDir, { recursive: true });

  let translations = {};

  if (locale === defaultLocale) {
    translations = defaultTranslations;
  } else {
    // Pour les autres langues, on met des placeholders
    Object.keys(defaultTranslations).forEach(key => {
      translations[key] = `[${locale.toUpperCase()}] ${defaultTranslations[key]}`;
    });
  }

  const filePath = path.join(localeDir, 'common.json');
  fs.writeFileSync(filePath, JSON.stringify(translations, null, 2));
  console.log(`- Fichier créé : ${filePath}`);
});

console.log('\n🎉 Opération terminée ! Les fichiers de traduction sont prêts dans `public/locales`.');
console.log('Prochaine étape : remplacez le texte statique dans votre code par les clés de traduction (ex: t(\'ma_cle\')).');