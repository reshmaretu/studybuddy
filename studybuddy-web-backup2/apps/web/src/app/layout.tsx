import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import AppLayoutWrapper from "@/components/AppLayoutWrapper";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "StudyBuddy",
  description: "Your cozy productivity sanctuary.",
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
            })();
          `}} />
      </head>
      <body className={`${outfit.className} bg-(--bg-dark) text-(--text-main)`}>
        <AppLayoutWrapper>
          {children}
          <Toaster 
            position="bottom-center"
            theme="dark"
            toastOptions={{ 
              style: { fontFamily: 'inherit' },
              classNames: {
                toast: 'group bg-(--bg-card)/90 backdrop-blur-xl border border-(--border-color) text-(--text-main) rounded-[24px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] p-5 gap-4 flex items-start relative overflow-visible',
                success: 'border-(--accent-teal)/40',
                warning: 'border-(--accent-yellow)/40',
                error: 'border-red-500/40',
                title: 'text-sm font-bold leading-relaxed',
                description: 'text-xs text-(--text-muted) font-medium',
                actionButton: 'bg-(--accent-teal) text-[#0b1211] font-bold rounded-xl',
                cancelButton: 'bg-(--bg-sidebar) text-(--text-main) font-bold rounded-xl',
              }
            }}
            icons={{
              success: <div className="w-8 h-8 rounded-full bg-(--accent-teal)/20 flex items-center justify-center shrink-0 border border-(--accent-teal)/30"><span className="text-sm">👻</span></div>,
              info: <div className="w-8 h-8 rounded-full bg-(--accent-teal)/20 flex items-center justify-center shrink-0 border border-(--accent-teal)/30"><span className="text-sm">👻</span></div>,
              warning: <div className="w-8 h-8 rounded-full bg-(--accent-yellow)/20 flex items-center justify-center shrink-0 border border-(--accent-yellow)/30"><span className="text-sm">👻</span></div>,
              error: <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 border border-red-500/30"><span className="text-sm">💀</span></div>,
            }}
          />
        </AppLayoutWrapper>
      </body>
    </html>
  );
}