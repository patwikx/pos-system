"use client"

import * as z from "zod"
import { useForm } from "react-hook-form"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { motion } from "framer-motion"

import { LoginSchema } from "@/lib/validations/schemas"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { FormError } from "@/components/form-error"
import { FormSuccess } from "@/components/form-success"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Mail, Lock, Loader2 } from 'lucide-react'
import { login } from "@/lib/auth-actions/login"
import Image from "next/image"

export const LoginForm = () => {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl")

  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [error, setError] = useState<string | undefined>("")
  const [success, setSuccess] = useState<string | undefined>("")
  const [isLoading, setIsLoading] = useState(false)


  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const onSubmit = async (values: z.infer<typeof LoginSchema>) => {
    setError("");
    setSuccess("");
    setIsLoading(true);
    try {
      const data = await login(values);
      if (data?.error) {
        setError(data.error);
      } else if (data.success) {
        window.location.assign("/");
      }
    } catch (error) {
      setError(`Something went wrong ${error}`);
    } finally {
      setIsLoading(false); // Allow interaction while waiting for redirect
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-[350px] sm:w-[400px]">
          <CardHeader>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              className="w-16 h-16 flex items-center justify-center mx-auto mb-4"
            >
              <Image src='/RDH.webp' alt="RDH Logo" width={80} height={80} />
            </motion.div>
            <h2 className="text-xl font-bold text-center whitespace-nowrap">RD Hardware & Fishing Supply, Inc.</h2>
            <h2 className="text-xl font-bold text-center">E-Commerce System</h2>
            <span className="text-sm text-muted-foreground text-center mt-4">Enter your credentials to access your account</span>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-4">
                  {showTwoFactor ? (
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Two Factor Code</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                {...field}
                                disabled={isLoading}
                                placeholder="123456"
                                className="pl-10"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : (
                    <>
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  {...field}
                                  disabled={isLoading}
                                  type="username"
                                  className="pl-10"
                                  placeholder="your@username.com"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                  {...field}
                                  disabled={isLoading}
                                  placeholder="******"
                                  type="password"
                                  className="pl-10"
                                />
                              </div>
                            </FormControl>
                            <Button
                              size="sm"
                              variant="link"
                              asChild
                              className="px-0 font-normal"
                            >
                              <Link href="/auth/reset">
                                Forgot password?
                              </Link>
                            </Button>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
                <FormError message={error} />
                <FormSuccess message={success} />
                <Button
                  disabled={isLoading}
                  type="submit"
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {showTwoFactor ? "Confirming..." : "Signing in..."}
                    </>
                  ) : (
                    showTwoFactor ? "Confirm" : "Sign in"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <span className="text-primary">
                Contact MIS Department.
              </span>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

