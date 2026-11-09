import { LoginForm } from "@/features/auth/components/login-form"

interface LoginPageProps {
  authError?: string | null
  adminLogin?: boolean
}

export default function LoginPage({
  authError = null,
  adminLogin = false,
}: LoginPageProps) {
  return <LoginForm authError={authError} adminLogin={adminLogin} />
}
