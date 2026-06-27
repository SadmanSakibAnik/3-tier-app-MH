"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Package, Search, Filter, Calendar, MapPin, Eye, Edit2, CheckCircle2, ChevronRight } from "lucide-react"

export default function AdminOrdersManager() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [statusNotes, setStatusNotes] = useState("")
  const limit = 10

  // Fetch all orders
  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminOrders", page, statusFilter, searchQuery],
    queryFn: async () => {
      const response = await api.get("/admin/orders", {
        params: { page, limit, status: statusFilter, search: searchQuery },
      })
      return response.data
    },
  })

  // Mutation to update order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      await api.put(`/admin/orders/${id}/status`, { status, notes })
    },
    onSuccess: (resData: any, variables: any) => {
      queryClient.invalidateQueries({ queryKey: ["adminOrders"] })
      queryClient.invalidateQueries({ queryKey: ["adminDashboardStats"] })
      
      // Update selected order in state if it's the one being modified
      if (selectedOrder && selectedOrder.id === variables.id) {
        refetchSelected(variables.id)
      }
      
      setStatusNotes("")
      alert(`Order status updated to ${variables.status}`)
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || "Failed to update order status")
    },
  })

  const refetchSelected = async (id: string) => {
    try {
      const response = await api.get(`/orders/${id}`)
      setSelectedOrder(response.data)
    } catch (e) {
      console.error(e)
    }
  }

  const orders = data?.data || []
  const totalCount = data?.total || 0

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

  // Get available next actions based on current status
  const getNextActions = (status: string) => {
    switch (status) {
      case "PENDING":
        return [
          { status: "CONFIRMED", label: "Confirm Order", color: "bg-blue-600 hover:bg-blue-700 text-white" },
          { status: "CANCELLED", label: "Cancel Order", color: "bg-red-600 hover:bg-red-700 text-white" },
        ]
      case "CONFIRMED":
        return [
          { status: "PROCESSING", label: "Start Processing", color: "bg-indigo-600 hover:bg-indigo-700 text-white" },
          { status: "CANCELLED", label: "Cancel Order", color: "bg-red-600 hover:bg-red-700 text-white" },
        ]
      case "PROCESSING":
        return [
          { status: "OUT_FOR_DELIVERY", label: "Dispatch to Rider", color: "bg-purple-600 hover:bg-purple-700 text-white" },
          { status: "CANCELLED", label: "Cancel Order", color: "bg-red-600 hover:bg-red-700 text-white" },
        ]
      case "OUT_FOR_DELIVERY":
        return [
          { status: "DELIVERED", label: "Mark Delivered", color: "bg-green-600 hover:bg-green-700 text-white" },
          { status: "RETURNED", label: "Mark Returned", color: "bg-orange-600 hover:bg-orange-700 text-white" },
        ]
      default:
        return [] // Terminal states (DELIVERED, CANCELLED, RETURNED)
    }
  }

  const handleUpdateStatus = (id: string, status: string) => {
    updateStatusMutation.mutate({ id, status, notes: statusNotes || `Status updated by admin to ${status}` })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Orders Manager</h1>
        <p className="text-sm text-slate-400">Track lifecycle transitions, search orders, and manage statuses.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Orders list */}
        <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${selectedOrder ? "lg:col-span-2" : "lg:col-span-3"}`}>
          {/* Controls */}
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search className="h-4 w-4" /></div>
              <input
                type="text"
                placeholder="Search Tracking ID, Sender, Recipient..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-sky-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-sky-500"
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
            <div className="flex h-96 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-slate-400 gap-2">
              <Package className="h-10 w-10 text-slate-300" />
              <p className="font-semibold">No orders matched criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="p-4">Tracking ID</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Recipient</th>
                    <th className="p-4">Fee</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {orders.map((order: any) => (
                    <tr
                      key={order.id}
                      onClick={() => refetchSelected(order.id)}
                      className={`cursor-pointer transition-colors ${
                        selectedOrder?.id === order.id ? "bg-sky-50/50" : "hover:bg-slate-50/30"
                      }`}
                    >
                      <td className="p-4 font-bold text-slate-800">{order.tracking_number}</td>
                      <td className="p-4">
                        <div className="font-bold text-slate-700">{order.customer?.name}</div>
                        <div className="text-[10px] text-slate-400">{order.customer?.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-700">{order.delivery_name}</div>
                        <div className="text-[10px] text-slate-400">{order.delivery_phone}</div>
                      </td>
                      <td className="p-4 font-bold text-slate-800">৳{parseFloat(order.delivery_fee).toFixed(2)}</td>
                      <td className="p-4">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50">
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
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

        {/* Selected Order Detail Sidebar / Panel */}
        {selectedOrder && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 h-fit lg:col-span-1">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800">Order Detail Summary</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                Close
              </button>
            </div>

            {/* Tracking ID & Status */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tracking Code</p>
              <p className="text-lg font-black text-slate-800">{selectedOrder.tracking_number}</p>
              <div className="mt-1.5">
                <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-2xs font-extrabold uppercase tracking-wider ${getStatusColor(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            {/* Addresses info */}
            <div className="space-y-3 border-t border-b border-slate-100 py-3 text-xs text-slate-600">
              <div>
                <p className="font-bold text-slate-400 uppercase text-[9px] mb-1">Pickup From</p>
                <div className="pl-1.5 border-l-2 border-slate-100">
                  <p className="font-bold text-slate-700">{selectedOrder.pickup_name} ({selectedOrder.pickup_phone})</p>
                  <p className="text-slate-500 text-3xs flex items-start gap-1"><MapPin className="h-3 w-3 shrink-0" /> {selectedOrder.pickup_address}</p>
                </div>
              </div>

              <div>
                <p className="font-bold text-slate-400 uppercase text-[9px] mb-1">Deliver To</p>
                <div className="pl-1.5 border-l-2 border-slate-100">
                  <p className="font-bold text-slate-700">{selectedOrder.delivery_name} ({selectedOrder.delivery_phone})</p>
                  <p className="text-slate-500 text-3xs flex items-start gap-1"><MapPin className="h-3 w-3 shrink-0" /> {selectedOrder.delivery_address}</p>
                </div>
              </div>
            </div>

            {/* billing and notes */}
            <div className="text-xs text-slate-500 space-y-1 bg-slate-50 p-3 rounded-xl">
              <div className="flex justify-between font-semibold"><span>Charge</span> <span className="font-bold text-slate-800">৳{parseFloat(selectedOrder.delivery_fee).toFixed(2)}</span></div>
              <div className="flex justify-between font-semibold"><span>Method</span> <span className="font-bold text-slate-800">{selectedOrder.payment?.method}</span></div>
              <div className="flex justify-between font-semibold"><span>Pay Status</span> <span className={`font-bold ${selectedOrder.payment?.status === "COMPLETED" ? "text-green-600" : "text-amber-500"}`}>{selectedOrder.payment?.status}</span></div>
            </div>

            {/* Action buttons mapping status transitions */}
            {getNextActions(selectedOrder.status).length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Progress Status Transition</p>
                
                {/* Notes input for status change */}
                <input
                  type="text"
                  placeholder="Enter status update comments/notes..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-sky-500"
                />

                <div className="flex flex-col gap-1.5">
                  {getNextActions(selectedOrder.status).map((action) => (
                    <button
                      key={action.status}
                      onClick={() => handleUpdateStatus(selectedOrder.id, action.status)}
                      className={`w-full rounded-xl py-2 px-3 text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${action.color}`}
                    >
                      <ChevronRight className="h-4 w-4" />
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
