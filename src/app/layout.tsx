import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import MainNav from '@/components/main-nav';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: 'Cloud Storage',
  description: 'A modern file manager application to upload, download, and manage your files.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <SidebarProvider>
              <MainNav />
              <SidebarInset>
                {children}
              </SidebarInset>
            </SidebarProvider>
          </FirebaseClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
