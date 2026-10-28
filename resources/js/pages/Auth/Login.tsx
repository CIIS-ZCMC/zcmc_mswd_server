import { LoginForm } from "@/features/auth/components/login-form"

interface LoginPageProps {
  iamError?: string | null
  adminLogin?: boolean
}

export default function LoginPage({
  iamError = null,
  adminLogin = false,
}: LoginPageProps) {
  return <LoginForm iamError={iamError} adminLogin={adminLogin} />
}
