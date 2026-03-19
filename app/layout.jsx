import './globals.css'

export const metadata = {
  title: 'H-TIC Launcher',
  description: 'Génération de contenu SEO automatisée via Make.com',
}

const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('htic-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch(e) {}
})();
`

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
