import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import AppLayoutWrapper from "@/components/AppLayoutWrapper";
import MobileErrorBoundary from "@/components/MobileErrorBoundary";


const inter = Inter({ subsets: ["latin"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "StudyBuddy",
  description: "Your cozy productivity sanctuary.",
  icons: {
    icon: "/assets/favicon.png",
    shortcut: "/assets/favicon.png",
    apple: "/assets/favicon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-theme="deep-teal" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                const savedTheme = localStorage.getItem('appTheme') || 'deep-teal';
                document.documentElement.setAttribute('data-theme', savedTheme);
              } catch (e) {}

              // 🛡️ Global Exception Capture for Mobile APK
              window.onerror = function(message, source, lineno, colno, error) {
                console.error("GLOBAL ERROR:", message, error);
                // We'll let the ErrorBoundary handle React errors, 
                // but this catches non-React crashes.
                if (typeof document !== 'undefined' && !document.getElementById('mobile-crash-overlay')) {
                    const div = document.createElement('div');
                    div.id = 'mobile-crash-overlay';
                    div.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#05080c;color:white;padding:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:sans-serif;';
                    div.innerHTML = \`
                        <div style="width:64px;height:64px;background:rgba(239,68,68,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:24px;font-size:32px;">⚠️</div>
                        <h1 style="font-size:20px;font-weight:900;margin-bottom:8px;color:#f87171;text-transform:uppercase;letter-spacing:0.1em;">Critical Engine Failure</h1>
                        <p style="font-size:14px;color:rgba(255,255,255,0.6);margin-bottom:32px;">A low-level system error occurred before the sanctuary could initialize.</p>
                        <div style="width:100%;max-width:400px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:16px;text-align:left;margin-bottom:32px;">
                            <p style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.4);margin-bottom:8px;">System Logs</p>
                            <div style="font-family:monospace;font-size:11px;color:#fca5a5;word-break:break-all;white-space:pre-wrap;max-height:150px;overflow-y:auto;padding:8px;background:rgba(239,68,68,0.05);border-radius:8px;border:1px solid rgba(239,68,68,0.1);">\${message}<br/><br/>\${error?.stack || 'No stack trace available'}</div>
                        </div>
                        <button onclick="window.location.reload()" style="padding:16px 32px;background:#84ccb9;color:black;border:none;border-radius:12px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;font-size:12px;cursor:pointer;">Re-Initialize</button>
                    \`;
                    document.body.appendChild(div);
                }
              };
            })();
          `}} />
      </head>
      <body className={`${outfit.className} bg-(--bg-dark) text-(--text-main)`}>
        <MobileErrorBoundary>
          <AppLayoutWrapper>
            {children}
          </AppLayoutWrapper>
        </MobileErrorBoundary>
      </body>
    </html>
  );
}