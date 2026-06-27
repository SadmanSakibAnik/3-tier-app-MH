"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as zod from "zod"
import { api } from "@/lib/api"
import { Settings, Lock, AlertCircle, CheckCircle, Sliders } from "lucide-react"

const passwordSchema = zod
  .object({
    old_password: zod.string().min(1, "Current password is required"),
    new_password: zod.string().min(6, "New password must be at least 6 characters"),
    confirm_password: zod.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })

type PasswordForm = zod.infer<typeof passwordSchema>

export default function AdminSettings() {
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  const handlePasswordUpdate = async (data: PasswordForm) => {
    setPasswordError(null)
    setPasswordSuccess(false)
    try {
      await api.put("/auth/password", {
        old_password: data.old_password,
        new_password: data.new_password,
      })
      setPasswordSuccess(true)
      reset()
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || "Failed to change password")
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
          <Settings className="h-6 w-6 text-sky-500" />
          <span>System Settings</span>
        </h1>
        <p className="text-sm text-slate-400">Configure delivery fare policies and update admin account credentials.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left: General info */}
        <div className="md:col-span-2 space-y-6">
          {/* Fare Config Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sliders className="h-5 w-5 text-sky-500" />
              <span>Base Delivery Rates</span>
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1">
                <p className="font-bold text-slate-400 uppercase tracking-wide">Base Delivery Fee</p>
                <p className="text-xl font-black text-slate-800">৳60.00</p>
                <p className="text-[10px] text-slate-400">Charged on all standard package scheduling requests.</p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-1">
                <p className="font-bold text-slate-400 uppercase tracking-wide">Distance Surcharges</p>
                <p className="text-xl font-black text-slate-800">Dynamic Calculation</p>
                <p className="text-[10px] text-slate-400">Determined automatically based on pickup/delivery distance.</p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-700">
              <p className="font-bold">Note regarding rate configs:</p>
              <p className="mt-1">Static values are set as standard default policies. Custom configurations can be managed by DB admins directly in the system parameters database tables.</p>
            </div>
          </div>
        </div>

        {/* Right: Security */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Lock className="h-5 w-5 text-sky-500" />
              <span>Security Settings</span>
            </h2>

            {passwordError && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-2xs text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 p-3 text-2xs text-green-600">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Password successfully changed.</span>
              </div>
            )}

            <form onSubmit={handleSubmit(handlePasswordUpdate)} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Current Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className={`w-full rounded-lg border bg-slate-50/50 py-2.5 px-3 outline-none transition-all ${
                    errors.old_password ? "border-red-500/50 focus:border-red-500" : "border-slate-200 focus:border-sky-500"
                  }`}
                  {...register("old_password")}
                />
                {errors.old_password && <p className="mt-0.5 text-[10px] text-red-500">{errors.old_password.message}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className={`w-full rounded-lg border bg-slate-50/50 py-2.5 px-3 outline-none transition-all ${
                    errors.new_password ? "border-red-500/50 focus:border-red-500" : "border-slate-200 focus:border-sky-500"
                  }`}
                  {...register("new_password")}
                />
                {errors.new_password && <p className="mt-0.5 text-[10px] text-red-500">{errors.new_password.message}</p>}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className={`w-full rounded-lg border bg-slate-50/50 py-2.5 px-3 outline-none transition-all ${
                    errors.confirm_password ? "border-red-500/50 focus:border-red-500" : "border-slate-200 focus:border-sky-500"
                  }`}
                  {...register("confirm_password")}
                />
                {errors.confirm_password && <p className="mt-0.5 text-[10px] text-red-500">{errors.confirm_password.message}</p>}
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 py-2.5 font-semibold text-white hover:opacity-95 shadow-sm text-center"
              >
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
