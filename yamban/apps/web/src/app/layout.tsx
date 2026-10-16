import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import './globals.css';
import type { Metadata } from 'next';
import { InlineScript } from '@/components/inline-script';

export const metadata: Metadata = {
  title: { default: 'Yamban', template: '%s | Yamban' },
  description: 'Orders, inventory, collections and expenses for the Yamban shop.',
};

// Set the theme before first paint: saved choice, else the OS preference.
const themeScript = `(function(){try{var t=localStorage.getItem('yb-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <InlineScript html={themeScript} />
      </head>
      <body>{children}</body>
    </html>
  );
}
