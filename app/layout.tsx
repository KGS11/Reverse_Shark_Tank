import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Digital Reverse Shark Tank | IEEE CS VVCE",
  description:
    "Startup turnaround competition platform organized by IEEE Computer Society – VVCE Student Branch.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-background font-sans antialiased text-foreground flex flex-col">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
