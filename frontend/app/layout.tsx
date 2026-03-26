import type { Metadata } from "next";
import { Manrope, Noto_Sans_KR } from "next/font/google";
import Script from "next/script";
import { Providers } from "./providers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JeolgamAI - 클라우드 비용 절감의 시작",
  description: "JeolgamAI 로그인",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeInit = `(function(){try{var t=localStorage.getItem('jeolgamai-theme');if(t==='dark'){document.documentElement.classList.add('dark');return;}if(t==='light'){document.documentElement.classList.remove('dark');return;}}catch(e){}document.documentElement.classList.remove('dark');})();`;

  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${manrope.variable} ${notoSansKr.variable} antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
