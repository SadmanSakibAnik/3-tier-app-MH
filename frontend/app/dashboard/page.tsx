"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Plus, Package, Truck, CheckCircle2, Eye, Ban, Calendar, MapPin } from "lucide-react"

export default function CustomerDashboard() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const limit = 10

  // Fetch orders using react-query
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customerOrders", page, statusFilter],
    queryFn: async () => {
      const response = await api.get("/orders", {
        params: { page, limit, status: statusFilter },
      })
      return response.data
    },
  })

  // Cancel order mutation
  const cancelOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      await api.delete(`/orders/${orderId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customerOrders"] })
      alert("Order cancelled successfully")
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Failed to cancel order")
    },
  })

  // Compute stats on current batch of data
  // For a production setup, we can also fetch these from a dedicated backend endpoint or compute on full data
  const orders = data?.data || []
  const totalCount = data?.total || 0

  const totalOrders = totalCount
  const activeOrders = orders.filter((o: any) =>
    ["PENDING", "CONFIRMED", "PROCESSING", "OUT_FOR_DELIVERY"].includes(o.status)
  ).length
  const completedOrders = orders.filter((o: any) => o.status === "DELIVERED").length

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-50 text-yellow-700 border-yellow-200"
      case "CONFIRMED":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "PROCESSING":
        return "bg-indigo-50 text-indigo-700 border-indigo-200"
      case "OUT_FOR_DELIVERY":
        return "bg-purple-50 text-purple-700 border-purple-200"
      case "DELIVERED":
        return "bg-green-50 text-green-700 border-green-200"
      case "RETURNED":
        return "bg-orange-50 text-orange-700 border-orange-200"
      case "CANCELLED":
        return "bg-red-50 text-red-700 border-red-200"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  const handleCancel = (id: string) => {
    if (confirm("Are you sure you want to cancel this order?")) {
      cancelOrderMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Welcome & CTA banner */}
      <div className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white md:flex-row md:items-center md:justify-between md:p-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Track & Ship Orders</h1>
          <p className="mt-1 text-sm text-violet-100">Create order, trace delivery lifecycle, and manage addresses instantly.</p>
        </div>
        <Link
          href="/orders/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-violet-700 shadow-md hover:bg-violet-50 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-5 w-5" />
          <span>New Order</span>
        </Link>
      </div>

      {/* Metric cards */}
      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders</p>
            <p className="text-2xl font-black text-slate-800">{totalOrders}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Deliveries</p>
            <p className="text-2xl font-black text-slate-800">{activeOrders}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-green-100 text-green-700 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Delivered Packages</p>
            <p className="text-2xl font-black text-slate-800">{completedOrders}</p>
          </div>
        </div>
      </div>

      {/* Orders list container */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Table headers / filters */}
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-bold text-slate-800">My Orders</h2>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-600 outline-none focus:border-violet-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="RETURNED">Returned</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent"></div>
          </div>
        ) : isError ? (
          <div className="flex h-64 items-center justify-center text-red-500">
            <span>Failed to load orders. Please try again.</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-slate-400 gap-2">
            <Package className="h-10 w-10 text-slate-300" />
            <p className="font-medium">No orders found.</p>
            <Link href="/orders/new" className="text-sm text-violet-600 font-semibold hover:underline">
              Place your first order
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-4">Tracking ID</th>
                  <th className="p-4">Recipient</th>
                  <th className="p-4">Destination</th>
                  <th className="p-4">Fee</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{order.tracking_number}</td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-700">{order.delivery_name}</div>
                      <div className="text-xs text-slate-400">{order.delivery_phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-slate-600 truncate max-w-xs">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate">{order.delivery_address}</span>
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-800">৳{parseFloat(order.delivery_fee).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                        title="Track Order"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      {order.status === "PENDING" && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                          title="Cancel Order"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination buttons */}
        {totalCount > limit && (
          <div className="flex items-center justify-between border-t border-slate-100 p-4 bg-slate-50/20">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-slate-400">
              Page {page} of {Math.ceil(totalCount / limit)}
            </span>
            <button
              onClick={() => setPage((p) => (p * limit < totalCount ? p + 1 : p))}
              disabled={page * limit >= totalCount}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
