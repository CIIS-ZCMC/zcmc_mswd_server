import React, { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { AlertCircle } from "lucide-react"
import { useAuth } from "../hooks/use-auth"

/**
 * No existing design to match here — the current UI never had a login
 * screen (Header.tsx hardcoded a user name). Built to match the app's own
 * branding block (the "Z" badge + heading pairing from Header.tsx) rather
 * than introduce a new visual language. Sized deliberately larger than the
 * app's dense, compact form density (h-7 inputs, text-xs) since a
 * full-screen sign-in gets more visual room than an inline table field.
 */
import { router } from "@inertiajs/react"

export const LoginForm: React.FC = () => {
  const { login, isLoggingIn, loginError } = useAuth()
  const [employeeNumber, setEmployeeNumber] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = Number(employeeNumber)
    if (!employeeNumber || Number.isNaN(parsed)) return
    try {
      await login({ employee_number: parsed, password })
      router.visit("/")
    } catch {
      // loginError captured in state
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-background px-4 font-sans">
      <Card className="w-full max-w-md py-8 [--card-spacing:--spacing(8)]">
        <CardHeader className="items-center text-center gap-4 pb-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-extrabold font-heading text-3xl shadow-xs">
            Z
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              ZCMC Medical Social Services
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Sign in to the Patient Safety Net Portal
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {loginError && (
              <Alert variant="destructive" className="px-3 py-2.5">
                <AlertCircle className="size-4" />
                <AlertTitle className="text-sm">Sign-in failed</AlertTitle>
                <AlertDescription className="text-sm">
                  {loginError.firstValidationMessage ?? loginError.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="login-employee-number" className="text-sm">
                Employee Number
              </Label>
              <Input
                id="login-employee-number"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="username"
                required
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value.replace(/\D/g, ""))}
                disabled={isLoggingIn}
                className="h-12 px-4 text-base md:text-base"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="login-password" className="text-sm">
                Password
              </Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
                className="h-12 px-4 text-base md:text-base"
              />
            </div>

            <Button
              type="submit"
              className="mt-2 h-12 gap-2 text-base font-bold"
              disabled={isLoggingIn}
            >
              {isLoggingIn && <Spinner className="size-4" />}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
