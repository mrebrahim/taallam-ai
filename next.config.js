/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { 
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'] 
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://raskcogecjfwuxvwldzp.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhc2tjb2dlY2pmd3V4dndsZHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzgzODAsImV4cCI6MjA5MTI1NDM4MH0.ZrtuVXEEFfuEbIkofglo_rEKwZZllZJ1DN2DElpB0ec',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://taallam-ai-n8narabic-1472s-projects.vercel.app',
  }
}
module.exports = nextConfig
