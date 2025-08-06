'use client'

import * as z from "zod"
import { useState, useTransition, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"


import { UserRegisterSchema } from "@/schemas"
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
import { registerUser } from "@/actions/queries"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

interface UserRegisterFormProps {
  storeId: string
  onUserCreated: () => void
  roles: { id: string; role: string }[]
}

export const UserRegisterForm: React.FC<UserRegisterFormProps> = ({ storeId, onUserCreated, roles }) => {
  const [error, setError] = useState<string | undefined>("")
  const [success, setSuccess] = useState<string | undefined>("")
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof UserRegisterSchema>>({
    resolver: zodResolver(UserRegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      storeId: storeId,
      roleId: ""
    },
  })

  useEffect(() => {
    form.setValue('storeId', storeId)
  }, [storeId, form])

  const onSubmit = (values: z.infer<typeof UserRegisterSchema>) => {
    if (!storeId) {
      setError("Store ID is required")
      return
    }
  
    setError("")
    setSuccess("")
    
    startTransition(() => {
      registerUser({
        ...values,
        storeId: storeId
      })
        .then((data) => {
          if (data.error) {
            setError(data.error)
          }
          if (data.success) {
            setSuccess(data.success)
            form.reset({
              email: "",
              password: "",
              name: "",
              storeId: storeId,
              roleId: ""
            })
            toast({
              title: "User created successfully.",
              description: "The new user has been added to the system.",
              duration: 5000,
            })
            setIsOpen(false)
            onUserCreated()
          }
        })
        .catch((err) => {
          console.error("Submission error:", err)
          setError("An unexpected error occurred")
        })
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={() => setIsOpen(true)}>Add New User</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create System User</DialogTitle>
          <DialogDescription>Fill in the details below:</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="email@example.com"
                        type="email"
                      />
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
                    <FormLabel className="font-semibold">Password</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="******"
                        type="password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-semibold">Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={isPending}
            >
              {isPending ? "Creating..." : "Create an account"}
            </Button>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
            {success && <p className="text-sm text-green-500 mt-2">{success}</p>}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}