import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import ClientOnly from "@/components/ClientOnly"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Healthcare Chatbot",
  description: "A chatbot for diagnosing health issues based on symptoms",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
  <body className={inter.className}>
    <ClientOnly>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </ClientOnly>
  </body>
</html>

  )
}
