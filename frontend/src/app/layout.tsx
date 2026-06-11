import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ChatProvider } from "@/context/ChatContext";
import { MainLayout } from "@/components/layout/MainLayout";

export const metadata: Metadata = {
  title: "SceneSense AI Platform",
  description: "Next-generation AI Decision Intelligence Chatbot Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        <ThemeProvider>
          <ChatProvider>
            <MainLayout>
              {children}
            </MainLayout>
          </ChatProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
