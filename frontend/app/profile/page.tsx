"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as zod from "zod"
import { api } from "@/lib/api"
import { Plus, Trash2, Edit, Save, Lock, AlertCircle, MapPin, User, Phone, CheckCircle } from "lucide-react"

const addressSchema = zod.object({
  title: zod.string().min(1, "Title is required (e.g. Home, Office)"),
  contact_name: zod.string().min(2, "Contact name is required"),
  contact_phone: zod.string().min(10, "Phone number is required"),
  address_line: zod.string().min(5, "Address line is required"),
  city: zod.string().min(1, "City is required"),
  postal_code: zod.string().optional(),
})

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

type AddressForm = zod.infer<typeof addressSchema>
type PasswordForm = zod.infer<typeof passwordSchema>

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Fetch addresses
  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["customerAddresses"],
    queryFn: async () => {
      const response = await api.get("/addresses")
      return response.data
    },
  })

  // Address forms
  const {
    register: regAddress,
    handleSubmit: handleAddressSubmit,
    reset: resetAddress,
    setValue: setAddressValue,
    formState: { errors: addressErrors },
  } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
  })

  // Password form
  const {
    register: regPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  // Mutations
  const addMutation = useMutation({
    mutationFn: async (data: AddressForm) => {
      await api.post("/addresses", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerAddresses"] })
      setShowAddForm(false)
      resetAddress()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AddressForm }) => {
      await api.put(`/addresses/${id}`, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerAddresses"] })
      setEditingAddressId(null)
      resetAddress()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/addresses/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerAddresses"] })
    },
  })

  const handleEdit = (addr: any) => {
    setEditingAddressId(addr.id)
    setAddressValue("title", addr.title)
    setAddressValue("contact_name", addr.contact_name)
    setAddressValue("contact_phone", addr.contact_phone)
    setAddressValue("address_line", addr.address_line)
    setAddressValue("city", addr.city)
    setAddressValue("postal_code", addr.postal_code || "")
  }

  const handlePasswordUpdate = async (data: PasswordForm) => {
    setPasswordError(null)
    setPasswordSuccess(false)
    try {
      await api.put("/auth/password", {
        old_password: data.old_password,
        new_password: data.new_password,
      })
      setPasswordSuccess(true)
      resetPassword()
    } catch (err: any) {
      setPasswordError(err.response?.data?.error || "Failed to change password")
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-3 max-w-6xl mx-auto">
      {/* Left: Address Directory CRUD */}
      <div className="md:col-span-2 space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-violet-600" />
              <span>Address Directory</span>
            </h2>
            {!showAddForm && !editingAddressId && (
              <button
                onClick={() => { resetAddress(); setShowAddForm(true); }}
                className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100/50 px-2.5 py-1.5 rounded-lg"
              >
                <Plus className="h-4 w-4" />
                <span>Add Address</span>
              </button>
            )}
          </div>

          {/* Add / Edit Form */}
          {(showAddForm || editingAddressId) && (
            <form
              onSubmit={handleAddressSubmit((data) => {
                if (editingAddressId) {
                  updateMutation.mutate({ id: editingAddressId, data })
                } else {
                  addMutation.mutate(data)
                }
              })}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-4"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {editingAddressId ? "Modify Saved Address" : "Save New Delivery Address"}
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-2xs font-bold uppercase text-slate-400 mb-1">Label (e.g. Home, Work)</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-violet-500"
                    placeholder="Home"
                    {...regAddress("title")}
                  />
                  {addressErrors.title && <p className="mt-0.5 text-[10px] text-red-500">{addressErrors.title.message}</p>}
                </div>

                <div>
                  <label className="block text-2xs font-bold uppercase text-slate-400 mb-1">Contact Name</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-violet-500"
                    placeholder="John Doe"
                    {...regAddress("contact_name")}
                  />
                  {addressErrors.contact_name && <p className="mt-0.5 text-[10px] text-red-500">{addressErrors.contact_name.message}</p>}
                </div>

                <div>
                  <label className="block text-2xs font-bold uppercase text-slate-400 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-violet-500"
                    placeholder="Phone"
                    {...regAddress("contact_phone")}
                  />
                  {addressErrors.contact_phone && <p className="mt-0.5 text-[10px] text-red-500">{addressErrors.contact_phone.message}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="block text-2xs font-bold uppercase text-slate-400 mb-1">Address Line</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-violet-500"
                    placeholder="123 Street Name"
                    {...regAddress("address_line")}
                  />
                  {addressErrors.address_line && <p className="mt-0.5 text-[10px] text-red-500">{addressErrors.address_line.message}</p>}
                </div>

                <div className="grid gap-2 grid-cols-2">
                  <div>
                    <label className="block text-2xs font-bold uppercase text-slate-400 mb-1">City</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-violet-500"
                      placeholder="Dhaka"
                      {...regAddress("city")}
                    />
                    {addressErrors.city && <p className="mt-0.5 text-[10px] text-red-500">{addressErrors.city.message}</p>}
                  </div>

                  <div>
                    <label className="block text-2xs font-bold uppercase text-slate-400 mb-1">Postal Code</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-violet-500"
                      placeholder="1200"
                      {...regAddress("postal_code")}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200/55 pt-3">
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setEditingAddressId(null); resetAddress(); }}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:opacity-95"
                >
                  Save Address
                </button>
              </div>
            </form>
          )}

          {/* Directory Listings */}
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
            </div>
          ) : addresses.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-400 font-medium">No saved addresses found. Add one for rapid order dispatching!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {addresses.map((addr: any) => (
                <div key={addr.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 relative hover:border-violet-200 transition-colors shadow-2xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="rounded-md bg-violet-50 border border-violet-100 px-2 py-0.5 text-3xs font-extrabold text-violet-700 uppercase tracking-wide">
                        {addr.title}
                      </span>
                      <p className="mt-1.5 text-sm font-bold text-slate-700 flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>{addr.contact_name}</span>
                      </p>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleEdit(addr)}
                        className="rounded-md border border-slate-100 p-1.5 text-slate-500 hover:bg-slate-50"
                        title="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => { if (confirm("Delete address?")) deleteMutation.mutate(addr.id); }}
                        className="rounded-md border border-red-100 p-1.5 text-red-500 hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500 border-t border-slate-100/60 pt-2">
                    <p className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-slate-400" /> {addr.contact_phone}</p>
                    <p className="flex items-start gap-1"><MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" /> {addr.address_line}, {addr.city} {addr.postal_code}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Change Password */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Lock className="h-5 w-5 text-violet-600" />
            <span>Security Settings</span>
          </h2>

          {passwordError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="flex items-start gap-2.5 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-600">
              <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Password successfully changed.</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit(handlePasswordUpdate)} className="space-y-4">
            <div>
              <label className="block text-2xs font-bold uppercase text-slate-400 mb-1.5">Current Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className={`w-full rounded-lg border bg-slate-50/50 py-2.5 px-3 text-xs outline-none transition-all ${
                  passwordErrors.old_password ? "border-red-500/50 focus:border-red-500" : "border-slate-200 focus:border-violet-500"
                }`}
                {...regPassword("old_password")}
              />
              {passwordErrors.old_password && <p className="mt-0.5 text-2xs text-red-500">{passwordErrors.old_password.message}</p>}
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase text-slate-400 mb-1.5">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className={`w-full rounded-lg border bg-slate-50/50 py-2.5 px-3 text-xs outline-none transition-all ${
                  passwordErrors.new_password ? "border-red-500/50 focus:border-red-500" : "border-slate-200 focus:border-violet-500"
                }`}
                {...regPassword("new_password")}
              />
              {passwordErrors.new_password && <p className="mt-0.5 text-2xs text-red-500">{passwordErrors.new_password.message}</p>}
            </div>

            <div>
              <label className="block text-2xs font-bold uppercase text-slate-400 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className={`w-full rounded-lg border bg-slate-50/50 py-2.5 px-3 text-xs outline-none transition-all ${
                  passwordErrors.confirm_password ? "border-red-500/50 focus:border-red-500" : "border-slate-200 focus:border-violet-500"
                }`}
                {...regPassword("confirm_password")}
              />
              {passwordErrors.confirm_password && <p className="mt-0.5 text-2xs text-red-500">{passwordErrors.confirm_password.message}</p>}
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 py-2.5 text-xs font-semibold text-white hover:opacity-95 shadow-sm"
            >
              Update Password
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
