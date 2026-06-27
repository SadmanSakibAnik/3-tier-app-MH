"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as zod from "zod"
import { api } from "@/lib/api"
import { ShieldCheck, Mail, Lock, User, Phone, AlertCircle, ArrowRight } from "lucide-react"

const registerSchema = zod
  .object({
    name: zod.string().min(2, "Name must be at least 2 characters"),
    email: zod.string().email("Please enter a valid email address"),
    phone: zod.string().min(10, "Phone number must be at least 10 characters"),
    password: zod.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: zod.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type RegisterForm = zod.infer<typeof registerSchema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setError(null)
    setLoading(true)
    try {
      await api.post("/auth/register", {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      })
      setSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl"></div>

      <div className="z-10 w-full max-w-md">
        {/* Branding header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-500/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
            Join Mehedi <span className="bg-gradient-to-r from-violet-400 to-indigo-300 bg-clip-text text-transparent">Delivery</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">Create an account to start placing orders</p>
        </div>

        {/* Form panel */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-400 text-center">
              Account created successfully! Redirecting to login...
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  placeholder="John Doe"
                  className={`w-full rounded-xl border bg-slate-950/50 py-2.5 pl-10 pr-4 text-white placeholder-slate-600 outline-none transition-all ${
                    errors.name ? "border-red-500/50 focus:border-red-500" : "border-slate-800 focus:border-violet-500"
                  }`}
                  {...register("name")}
                />
              </div>
              {errors.name && <p className="mt-0.5 text-xs text-red-400">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  placeholder="name@domain.com"
                  className={`w-full rounded-xl border bg-slate-950/50 py-2.5 pl-10 pr-4 text-white placeholder-slate-600 outline-none transition-all ${
                    errors.email ? "border-red-500/50 focus:border-red-500" : "border-slate-800 focus:border-violet-500"
                  }`}
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="mt-0.5 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Phone Number</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Phone className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  placeholder="+88017XXXXXXXX"
                  className={`w-full rounded-xl border bg-slate-950/50 py-2.5 pl-10 pr-4 text-white placeholder-slate-600 outline-none transition-all ${
                    errors.phone ? "border-red-500/50 focus:border-red-500" : "border-slate-800 focus:border-violet-500"
                  }`}
                  {...register("phone")}
                />
              </div>
              {errors.phone && <p className="mt-0.5 text-xs text-red-400">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className={`w-full rounded-xl border bg-slate-950/50 py-2.5 pl-10 pr-4 text-white placeholder-slate-600 outline-none transition-all ${
                    errors.password ? "border-red-500/50 focus:border-red-500" : "border-slate-800 focus:border-violet-500"
                  }`}
                  {...register("password")}
                />
              </div>
              {errors.password && <p className="mt-0.5 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Confirm Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className={`w-full rounded-xl border bg-slate-950/50 py-2.5 pl-10 pr-4 text-white placeholder-slate-600 outline-none transition-all ${
                    errors.confirmPassword ? "border-red-500/50 focus:border-red-500" : "border-slate-800 focus:border-violet-500"
                  }`}
                  {...register("confirmPassword")}
                />
              </div>
              {errors.confirmPassword && <p className="mt-0.5 text-xs text-red-400">{errors.confirmPassword.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-violet-400 hover:text-violet-300">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
