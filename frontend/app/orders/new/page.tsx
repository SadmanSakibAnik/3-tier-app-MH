"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as zod from "zod"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ArrowLeft, MapPin, Phone, User, FileText, Wallet } from "lucide-react"

const orderSchema = zod.object({
  pickup_name: zod.string().min(2, "Pickup contact name is required"),
  pickup_phone: zod.string().min(10, "Pickup phone number is required"),
  pickup_address: zod.string().min(5, "Pickup address is required"),
  delivery_name: zod.string().min(2, "Recipient name is required"),
  delivery_phone: zod.string().min(10, "Recipient phone number is required"),
  delivery_address: zod.string().min(5, "Recipient address is required"),
  payment_method: zod.string().default("CASH_ON_DELIVERY"),
  notes: zod.string().optional(),
})

type OrderForm = zod.infer<typeof orderSchema>

export default function CreateOrder() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [estimatedFee, setEstimatedFee] = useState<number | null>(null)

  // Fetch saved customer addresses
  const { data: addresses = [] } = useQuery({
    queryKey: ["customerAddresses"],
    queryFn: async () => {
      const response = await api.get("/addresses")
      return response.data
    },
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrderForm>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      payment_method: "CASH_ON_DELIVERY",
    },
  })

  // Watch pickup and delivery addresses to estimate fee
  const pickupAddr = watch("pickup_address")
  const deliveryAddr = watch("delivery_address")

  useEffect(() => {
    if (pickupAddr && deliveryAddr && pickupAddr.length > 5 && deliveryAddr.length > 5) {
      // Dummy estimation algorithm: base ৳60 + sum of string lengths for deterministic dummy distance fee
      const lengthSum = pickupAddr.length + deliveryAddr.length
      const estimated = 60.0 + (lengthSum % 15) * 10 + 25
      setEstimatedFee(estimated)
    } else {
      setEstimatedFee(null)
    }
  }, [pickupAddr, deliveryAddr])

  const onSubmit = async (data: OrderForm) => {
    setSubmitting(true)
    try {
      const response = await api.post("/orders", data)
      const newOrder = response.data
      router.push(`/orders/${newOrder.id}`)
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to create order")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSelectSavedAddress = (type: "pickup" | "delivery", address: any) => {
    if (type === "pickup") {
      setValue("pickup_name", address.contact_name)
      setValue("pickup_phone", address.contact_phone)
      setValue("pickup_address", `${address.address_line}, ${address.city}`)
    } else {
      setValue("delivery_name", address.contact_name)
      setValue("delivery_phone", address.contact_phone)
      setValue("delivery_address", `${address.address_line}, ${address.city}`)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Place Delivery Order</h1>
          <p className="text-sm text-slate-400">Fill in the details to schedule a package delivery.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 md:grid-cols-3">
        {/* Left Side: Address Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Pickup Details Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">1</span>
              <span>Pickup Information</span>
            </h2>

            {/* Saved addresses selector */}
            {addresses.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Use Saved Address</label>
                <div className="flex flex-wrap gap-2">
                  {addresses.map((addr: any) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => handleSelectSavedAddress("pickup", addr)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-violet-500 hover:bg-violet-50 transition-colors"
                    >
                      {addr.title} ({addr.contact_name})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Contact Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><User className="h-4 w-4" /></div>
                  <input
                    type="text"
                    placeholder="Sender Name"
                    className={`w-full rounded-xl border bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm outline-none transition-all ${
                      errors.pickup_name ? "border-red-500/50 focus:border-red-500" : "border-slate-200 focus:border-violet-500"
                    }`}
                    {...register("pickup_name")}
                  />
                </div>
                {errors.pickup_name && <p className="mt-0.5 text-xs text-red-400">{errors.pickup_name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Phone className="h-4 w-4" /></div>
                  <input
                    type="text"
                    placeholder="Phone"
                    className={`w-full rounded-xl border bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm outline-none transition-all ${
                      errors.pickup_phone ? "border-red-500/50 focus:border-red-500" : "border-slate-200 focus:border-violet-500"
                    }`}
                    {...register("pickup_phone")}
                  />
                </div>
                {errors.pickup_phone && <p className="mt-0.5 text-xs text-red-400">{errors.pickup_phone.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Full Pickup Address</label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none text-slate-400"><MapPin className="h-4 w-4" /></div>
                <textarea
                  placeholder="Street Address, Appt, Building, City, Zip"
                  rows={2}
                  className={`w-full rounded-xl border bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm outline-none transition-all resize-none ${
                    errors.pickup_address ? "border-red-500/50 focus:border-red-500" : "border-slate-200 focus:border-violet-500"
                  }`}
                  {...register("pickup_address")}
                />
              </div>
              {errors.pickup_address && <p className="mt-0.5 text-xs text-red-400">{errors.pickup_address.message}</p>}
            </div>
          </div>

          {/* Delivery Details Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">2</span>
              <span>Delivery Destination</span>
            </h2>

            {/* Saved addresses selector */}
            {addresses.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Use Saved Address</label>
                <div className="flex flex-wrap gap-2">
                  {addresses.map((addr: any) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => handleSelectSavedAddress("delivery", addr)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-violet-500 hover:bg-violet-50 transition-colors"
                    >
                      {addr.title} ({addr.contact_name})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Recipient Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><User className="h-4 w-4" /></div>
                  <input
                    type="text"
                    placeholder="Recipient Name"
                    className={`w-full rounded-xl border bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm outline-none transition-all ${
                      errors.delivery_name ? "border-red-500/50 focus:border-red-500" : "border-slate-200 focus:border-violet-500"
                    }`}
                    {...register("delivery_name")}
                  />
                </div>
                {errors.delivery_name && <p className="mt-0.5 text-xs text-red-400">{errors.delivery_name.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Recipient Phone</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Phone className="h-4 w-4" /></div>
                  <input
                    type="text"
                    placeholder="Recipient Phone"
                    className={`w-full rounded-xl border bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm outline-none transition-all ${
                      errors.delivery_phone ? "border-red-500/50 focus:border-red-500" : "border-slate-200 focus:border-violet-500"
                    }`}
                    {...register("delivery_phone")}
                  />
                </div>
                {errors.delivery_phone && <p className="mt-0.5 text-xs text-red-400">{errors.delivery_phone.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Full Delivery Address</label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none text-slate-400"><MapPin className="h-4 w-4" /></div>
                <textarea
                  placeholder="Street Address, Appt, Building, City, Zip"
                  rows={2}
                  className={`w-full rounded-xl border bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm outline-none transition-all resize-none ${
                    errors.delivery_address ? "border-red-500/50 focus:border-red-500" : "border-slate-200 focus:border-violet-500"
                  }`}
                  {...register("delivery_address")}
                />
              </div>
              {errors.delivery_address && <p className="mt-0.5 text-xs text-red-400">{errors.delivery_address.message}</p>}
            </div>
          </div>
        </div>

        {/* Right Side: Pricing summary & Notes */}
        <div className="space-y-6">
          {/* Fee Surcharge Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">3</span>
              <span>Pricing & Payment</span>
            </h2>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Payment Method</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Wallet className="h-4 w-4" /></div>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm outline-none transition-all focus:border-violet-500"
                  {...register("payment_method")}
                >
                  <option value="CASH_ON_DELIVERY">Cash on Delivery</option>
                  <option value="BKASH">bKash (Mobile Pay)</option>
                  <option value="CARD">Debit/Credit Card</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">Delivery Notes</label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none text-slate-400"><FileText className="h-4 w-4" /></div>
                <textarea
                  placeholder="e.g. Fragile package, Ring bell"
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-3 text-sm outline-none transition-all resize-none focus:border-violet-500"
                  {...register("notes")}
                />
              </div>
            </div>

            {/* Fee summary block */}
            <div className="rounded-xl bg-slate-50 p-4 space-y-2">
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>Base Delivery Fare</span>
                <span>৳60.00</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-semibold border-b border-slate-200/60 pb-2">
                <span>Distance Surcharge</span>
                <span>{estimatedFee ? `৳${(estimatedFee - 60.0).toFixed(2)}` : "--"}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-800 pt-1">
                <span>Total Delivery Fee</span>
                <span className="text-violet-600 flex items-center">
                  <span className="text-sm font-bold">৳</span>
                  <span>{estimatedFee ? estimatedFee.toFixed(2) : "0.00"}</span>
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 font-semibold text-white shadow-lg shadow-violet-600/20 hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Processing Order..." : "Confirm & Place Order"}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
