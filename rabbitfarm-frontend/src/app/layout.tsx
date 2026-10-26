import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RabbitFarm Manager",
  description:
    "Manage rabbit breeding, health, feed inventory, sales, and farm finances.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}