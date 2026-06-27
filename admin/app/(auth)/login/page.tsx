"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as zod from "zod"
import { api } from "@/lib/api"
import { ShieldAlert, Mail, Lock, AlertCircle, ArrowRight } from "lucide-react"

const loginSchema = zod.object({
  email: zod.string().email("Please enter a valid email address"),
  password: zod.string().min(1, "Password is required"),
})

type LoginForm = zod.infer<typeof loginSchema>

export default function AdminLoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setLoading(true)
    try {
      const response = await api.post("/auth/login", data)
      const { access_token, refresh_token, user } = response.data

      // Check role authorization
      if (user.role?.name !== "SUPER_ADMIN" && user.role?.name !== "ADMIN") {
        setError("Access denied: only administrators are authorized to access this portal.")
        setLoading(false)
        return
      }

      // Save credentials
      localStorage.setItem("accessToken", access_token)
      localStorage.setItem("refreshToken", refresh_token)
      localStorage.setItem("user", JSON.stringify(user))

      router.push("/dashboard")
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid credentials. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-sky-600/10 blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl"></div>

      <div className="z-10 w-full max-w-md">
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/20">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
            Mehedi <span className="bg-gradient-to-r from-sky-400 to-indigo-300 bg-clip-text text-transparent">Admin</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">Sign in with administrative credentials</p>
        </div>

        {/* Form panel */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Admin Email</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  placeholder="admin@mehedi.com"
                  className={`w-full rounded-xl border bg-slate-950/50 py-3 pl-10 pr-4 text-white placeholder-slate-600 outline-none transition-all ${
                    errors.email ? "border-red-500/50 focus:border-red-500" : "border-slate-800 focus:border-sky-500"
                  }`}
                  {...register("email")}
                />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className={`w-full rounded-xl border bg-slate-950/50 py-3 pl-10 pr-4 text-white placeholder-slate-600 outline-none transition-all ${
                    errors.password ? "border-red-500/50 focus:border-red-500" : "border-slate-800 focus:border-sky-500"
                  }`}
                  {...register("password")}
                />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 py-3 font-semibold text-white shadow-lg shadow-sky-500/20 hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <span>Authenticate</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Default credentials alert */}
        <div className="mt-6 rounded-xl border border-sky-500/10 bg-sky-950/20 p-4 text-xs text-slate-400 text-center">
          <p className="font-bold text-sky-400 mb-1">Seeded Administrator Account:</p>
          <p>Email: <code className="text-white">admin@mehedi.com</code></p>
          <p>Password: <code className="text-white">AdminPass123!</code></p>
        </div>
      </div>
    </div>
  )
}
