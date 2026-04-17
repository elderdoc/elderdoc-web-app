import { signIn } from '@/auth'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue to ElderDoc</p>
        </div>
        <form action={async () => {
          'use server'
          await signIn('google', { redirectTo: '/' })
        }}>
          <button
            type="submit"
            className="w-full rounded-[8px] bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  )
}
