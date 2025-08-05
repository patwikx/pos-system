"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { loginAction } from "@/lib/actions/auth-actions"
import { AlertCircle, Loader2 } from "lucide-react"
import Image from "next/image"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-base transition-all duration-200 shadow-lg hover:shadow-xl"
      aria-disabled={pending}
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Signing in...
        </>
      ) : (
        "Sign in"
      )}
    </Button>
  )
}

export default function LoginPage() {
  const [errorMessage, dispatch] = useActionState(loginAction, undefined)

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Dimmed Royal Blue Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500">
        {/* Animated background elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          {/* Large decorative circles - more visible */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-200/25 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-blue-400/20 rounded-full blur-2xl animate-pulse delay-500"></div>
          <div className="absolute top-1/4 right-1/3 w-48 h-48 bg-blue-300/25 rounded-full blur-2xl animate-pulse delay-700"></div>

          {/* Grid pattern overlay - more visible */}
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.25) 1px, transparent 0)`,
              backgroundSize: "20px 20px",
            }}
          ></div>

          {/* Subtle geometric shapes - more visible */}
          <div className="absolute top-20 left-20 w-2 h-2 bg-white/30 rounded-full animate-pulse delay-300"></div>
          <div className="absolute top-40 right-32 w-1 h-1 bg-white/40 rounded-full animate-pulse delay-1200"></div>
          <div className="absolute bottom-32 left-1/3 w-1.5 h-1.5 bg-white/35 rounded-full animate-pulse delay-800"></div>
          <div className="absolute bottom-20 right-20 w-2 h-2 bg-white/30 rounded-full animate-pulse delay-400"></div>

          {/* Additional pattern elements for more visibility */}
          <div className="absolute top-1/3 left-10 w-3 h-3 bg-white/20 rounded-full animate-pulse delay-600"></div>
          <div className="absolute bottom-1/4 right-10 w-2.5 h-2.5 bg-white/25 rounded-full animate-pulse delay-900"></div>
          <div className="absolute top-3/4 left-1/2 w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse delay-1100"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center mb-6 relative overflow-hidden">
              <Image src='/rdrdc-logo.png' alt="logo" width={75} height={75} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-3 drop-shadow-lg">RD Realty Group - LMS</h1>
            <p className="text-blue-50/95 text-lg font-medium">Sign in to access your dashboard</p>
          </div>

          {/* Login Card */}
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-lg relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-white/30 pointer-events-none"></div>
            <CardHeader className="pb-6 relative">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome back! 👋</h2>
                <p className="text-slate-600 font-medium">Enter your credentials to continue</p>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 relative">
              <form action={dispatch} className="space-y-6">
                {/* Employee ID */}
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Z-123"
                    required
                    className="h-12 border-slate-300 focus:border-blue-600 focus:ring-blue-600 focus:ring-2 bg-white/80 backdrop-blur-sm text-base font-medium transition-all duration-200"
                  />
                </div>

                {/* Password */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
                      Password
                    </Label>
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    className="h-12 border-slate-300 focus:border-blue-600 focus:ring-blue-600 focus:ring-2 bg-white/80 backdrop-blur-sm text-base font-medium transition-all duration-200"
                  />
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="flex items-start gap-3 p-4 bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-xl shadow-sm">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-red-800 mb-1">Authentication failed</h3>
                      <p className="text-sm text-red-700">{errorMessage}</p>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <SubmitButton />
                </div>
              </form>

              {/* Support Contact */}
              <div className="mt-4 pt-6 border-t border-slate-200/60 text-center">
                <p className="text-sm text-slate-600 mb-3 font-medium">Need help accessing your account?</p>
                <Link
                  href="#"
                  className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300"
                >
                  Contact MIS Department
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-4 text-center whitespace-nowrap">
            <p className="text-sm text-blue-50/90 font-medium leading-relaxed">
              By signing in, you agree to our{" "}
              <Link
                href="#"
                className="text-white hover:text-blue-100 font-semibold underline underline-offset-2 decoration-white/70 hover:decoration-blue-100 transition-all duration-200"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="#"
                className="text-white hover:text-blue-100 whitespace-nowrap font-semibold underline underline-offset-2 decoration-white/70 hover:decoration-blue-100 transition-all duration-200"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
