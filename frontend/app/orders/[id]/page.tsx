"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ArrowLeft, Check, Package, Clock, Truck, CheckCircle, Ban, Calendar, MapPin, Phone, User, RefreshCw } from "lucide-react"

export default function OrderTracking() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const orderId = params.id as string

  // Fetch single order details
  const { data: order, isLoading, isError, refetch } = useQuery({
    queryKey: ["orderDetail", orderId],
    queryFn: async () => {
      const response = await api.get(`/orders/${orderId}`)
      return response.data
    },
    enabled: !!orderId,
  })

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/orders/${orderId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orderDetail", orderId] })
      alert("Order successfully cancelled")
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Failed to cancel order")
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-red-500 font-bold">Failed to load order tracking details.</p>
        <Link href="/dashboard" className="text-violet-600 font-semibold hover:underline">
          Go back to dashboard
        </Link>
      </div>
    )
  }

  // Stepper helper
  const statuses = ["PENDING", "CONFIRMED", "PROCESSING", "OUT_FOR_DELIVERY", "DELIVERED"]
  const currentStatusIndex = statuses.indexOf(order.status)
  
  // Custom check for Cancelled/Returned
  const isCancelled = order.status === "CANCELLED"
  const isReturned = order.status === "RETURNED"

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return Package
      case "CONFIRMED":
        return Clock
      case "PROCESSING":
        return RefreshCw
      case "OUT_FOR_DELIVERY":
        return Truck
      case "DELIVERED":
        return CheckCircle
      default:
        return Package
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-800">Track Order: {order.tracking_number}</h1>
              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider ${
                isCancelled ? "bg-red-50 text-red-700 border-red-200" :
                isReturned ? "bg-orange-50 text-orange-700 border-orange-200" :
                "bg-violet-50 text-violet-700 border-violet-200"
              }`}>
                {order.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">Placed on {new Date(order.created_at).toLocaleString()}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          {order.status === "PENDING" && (
            <button
              onClick={() => { if (confirm("Cancel this order?")) cancelMutation.mutate(); }}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100/50 flex items-center gap-2"
            >
              <Ban className="h-4 w-4" />
              <span>Cancel Order</span>
            </button>
          )}
        </div>
      </div>

      {/* Stepper Status tracker */}
      {!isCancelled && !isReturned && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="relative flex justify-between items-center w-full">
            {/* Base line */}
            <div className="absolute top-1/2 left-0 h-0.5 w-full bg-slate-100 -translate-y-1/2 -z-0"></div>
            
            {/* Progress line */}
            {currentStatusIndex >= 0 && (
              <div
                className="absolute top-1/2 left-0 h-0.5 bg-violet-600 -translate-y-1/2 -z-0 transition-all duration-500"
                style={{ width: `${(currentStatusIndex / (statuses.length - 1)) * 100}%` }}
              ></div>
            )}

            {statuses.map((status, index) => {
              const Icon = getStatusIcon(status)
              const isCompleted = index <= currentStatusIndex
              const isActive = index === currentStatusIndex

              return (
                <div key={status} className="relative z-10 flex flex-col items-center gap-2">
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? "bg-violet-600 border-violet-600 text-white shadow-md shadow-violet-500/25"
                        : "bg-white border-slate-200 text-slate-400"
                    } ${isActive ? "ring-4 ring-violet-100" : ""}`}
                  >
                    {isCompleted && index < currentStatusIndex ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isCompleted ? "text-violet-600" : "text-slate-400"}`}>
                    {status.replace(/_/g, " ")}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cancelled/Returned alerts */}
      {isCancelled && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm flex items-center gap-4 text-red-700">
          <Ban className="h-8 w-8 shrink-0" />
          <div>
            <h3 className="font-bold">This order has been cancelled</h3>
            <p className="text-xs text-red-500">Refund processes or returns, if applicable, are handled automatically.</p>
          </div>
        </div>
      )}

      {isReturned && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm flex items-center gap-4 text-orange-700">
          <RefreshCw className="h-8 w-8 shrink-0" />
          <div>
            <h3 className="font-bold">This order has been returned</h3>
            <p className="text-xs text-orange-500">The package was unable to be delivered and has been returned to the pickup address.</p>
          </div>
        </div>
      )}

      {/* Grid: Delivery details & status history logs */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Detail Panel */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Delivery Information</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pickup Point</p>
                <div className="flex gap-2">
                  <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">{order.pickup_name}</p>
                    <p className="text-xs text-slate-500">{order.pickup_phone}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600">{order.pickup_address}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Destination</p>
                <div className="flex gap-2">
                  <User className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-slate-700">{order.delivery_name}</p>
                    <p className="text-xs text-slate-500">{order.delivery_phone}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600">{order.delivery_address}</p>
                </div>
              </div>
            </div>

            {order.notes && (
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-slate-600">{order.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Pricing & Timeline logs */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Billing Summary</h2>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-500 font-semibold">
                <span>Payment Method</span>
                <span>{order.payment?.method?.replace(/_/g, " ") || "COD"}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 font-semibold border-b border-slate-100 pb-2">
                <span>Payment Status</span>
                <span className={`font-bold ${order.payment?.status === "COMPLETED" ? "text-green-600" : "text-amber-500"}`}>
                  {order.payment?.status || "PENDING"}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-800 pt-1">
                <span>Total Charge</span>
                <span className="text-violet-600">৳{parseFloat(order.delivery_fee).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-3">Journey logs</h2>

            <div className="relative pl-4 border-l-2 border-slate-100 space-y-5">
              {order.status_history?.map((hist: any, index: number) => (
                <div key={hist.id} className="relative">
                  {/* Timeline bullet */}
                  <div className={`absolute -left-[21px] top-1.5 h-2 w-2 rounded-full ${index === 0 ? "bg-violet-600 ring-4 ring-violet-100" : "bg-slate-300"}`}></div>
                  <div className="space-y-0.5">
                    <p className={`text-xs font-bold uppercase tracking-wider ${index === 0 ? "text-slate-800" : "text-slate-400"}`}>
                      {hist.status.replace(/_/g, " ")}
                    </p>
                    {hist.notes && <p className="text-xs text-slate-500">{hist.notes}</p>}
                    <p className="text-[10px] text-slate-400">{new Date(hist.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
