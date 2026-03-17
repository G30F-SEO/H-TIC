import './globals.css'

export const metadata = {
  title: 'H-TIC Launcher',
  description: 'Génération de contenu SEO automatisée via Make.com',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
