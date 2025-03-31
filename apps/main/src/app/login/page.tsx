import { redirect } from 'next/navigation'
import { createClient } from '@/supabase/server'
import LoginForm from './login-form'

export const metadata = {
  title: 'Algo Trader',
  description: 'Algo Trader',
}

export const dynamic = 'force-dynamic'
export default async function LoginPage() {
  const supabase = await createClient()
  
  const { data: { session } } = await supabase.auth.getSession()
  
  if (session) {
    redirect('/')
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <LoginForm />
      </div>
    </div>
  )
} 