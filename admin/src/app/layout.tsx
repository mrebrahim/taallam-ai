import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Taallam Admin', description: 'لوحة تحكم Taallam AI' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ar" dir="rtl"><body style={{margin:0, fontFamily:'system-ui, sans-serif'}}>{children}</body></html>
}
