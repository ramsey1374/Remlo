import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Remlo",
  description: "Pay USDC from anywhere — settles on Arc Network",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Remlo",
    description: "Pay USDC from anywhere — settles on Arc Network",
    images: ["/og-image.png"], // see step 3
    url: "https://remlo-five.vercel.app",
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0d0d14] text-white min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}