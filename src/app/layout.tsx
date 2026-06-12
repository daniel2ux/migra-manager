import type {Metadata} from 'next';
import './globals.css';
import {Toaster} from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { SelectionProvider } from '@/context/selection-context';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata: Metadata = {
  title: 'IS-U Migra',
  description: 'Professional management system for IS-U data migration tasks.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- Inter global no root layout */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* Global error handler for ChunkLoadErrors (deployment mismatches) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Handle JS ChunkLoadErrors
                window.onerror = function(msg) {
                  if (msg && (msg.toString().toLowerCase().indexOf('chunkloaderror') !== -1 || 
                      msg.toString().toLowerCase().indexOf('loading chunk') !== -1)) {
                    window.location.reload();
                  }
                };
                window.onunhandledrejection = function(event) {
                  if (event.reason && (event.reason.name === 'ChunkLoadError' || 
                      (event.reason.message && event.reason.message.indexOf('ChunkLoadError') !== -1))) {
                    window.location.reload();
                  }
                };
                // Handle static resource 404s (CSS/Scripts)
                window.addEventListener('error', function(e) {
                  var target = e.target;
                  if (target && (target.tagName === 'LINK' || target.tagName === 'SCRIPT')) {
                    var url = target.src || target.href;
                    if (url && url.indexOf('_next/static') !== -1) {
                      console.warn('Resource mismatch detected, reloading...', url);
                      window.location.reload();
                    }
                  }
                }, true);
              })();
            `
          }}
        />
      </head>
      <body className="font-body antialiased">
        <ErrorBoundary>
          <FirebaseClientProvider>
            <SelectionProvider>
              <TooltipProvider>
                {children}
              </TooltipProvider>
            </SelectionProvider>
          </FirebaseClientProvider>
        </ErrorBoundary>
        <div className="print:hidden"><Toaster /></div>
      </body>
    </html>
  );
}
