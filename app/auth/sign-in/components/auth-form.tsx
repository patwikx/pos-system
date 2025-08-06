'use client'

import * as React from "react"
import { useRouter } from "next/navigation" // 1. Import the router for manual navigation
import { cn } from "@/lib/utils"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/ui/icons"

import { toast } from "sonner"
import { signIn } from "next-auth/react"

// Use a 'type' alias to avoid the empty-interface ESLint error
type UserAuthFormProps = React.HTMLAttributes<HTMLDivElement>;

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
  // 2. Initialize the router
  const router = useRouter(); 
  
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // 3. Use `redirect: false` to handle the result in the component
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false, 
      });

      // 4. Check the result and provide specific feedback
      if (result?.ok) {
        // On success, show a toast and manually redirect
        toast.success("Login successful! Welcome back.");
       router.push("/");
      } else {
        // On failure, show a specific error toast without a page reload
        toast.error("Invalid credentials. Please check your email and password.");
        setIsLoading(false); // Stop the loading spinner on failure
      }

    } catch (error) {
      // This catch block is for truly unexpected errors, like network issues
      toast.error(`An unexpected network error occurred. Please try again. ${error}`);
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("grid gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="font-bold text-left" htmlFor="email">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              required
            />
          </div>
          <div className="grid gap-1 mt-1">
            <Label className="font-bold text-left" htmlFor="password">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <Button type="submit" disabled={isLoading} className="mt-2 w-full">
            {isLoading && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            Login
          </Button>
        </div>
      </form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
      </div>
    </div>
  )
}