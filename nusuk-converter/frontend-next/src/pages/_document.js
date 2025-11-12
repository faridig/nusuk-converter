// frontend-next/src/pages/_document.js
import { Html, Head, Main, NextScript } from "next/document";

export default function Document(props) { // <-- Recevez les props
  return (
    // Utilisez la locale actuelle pour l'attribut lang
    <Html lang={props.locale || 'en'}> 
      <Head />
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}