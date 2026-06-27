"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Package, Truck, CheckCircle, Users, ArrowUpRight, TrendingUp } from "lucide-react"

export default function AdminDashboard() {
  // Fetch admin dashboard stats
  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["adminDashboardStats"],
    queryFn: async () => {
      const response = await api.get("/admin/dashboard")
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
      </div>
    )
  }

  if (isError || !stats) {
    return (
      <div className="text-center py-12 text-red-500 font-bold">
        Failed to load admin dashboard statistics.
      </div>
    )
  }

  const cards = [
    {
      title: "Total Orders",
      value: stats.total_orders,
      icon: Package,
      color: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      title: "Active Orders",
      value: stats.active_orders,
      icon: Truck,
      color: "bg-sky-50 text-sky-600 border-sky-100",
    },
    {
      title: "Delivered Orders",
      value: stats.delivered_orders,
      icon: CheckCircle,
      color: "bg-green-50 text-green-600 border-green-100",
    },
    {
      title: "Total Customers",
      value: stats.total_customers,
      icon: Users,
      color: "bg-violet-50 text-violet-600 border-violet-100",
    },
  ]

  // Mock revenue chart data
  const revenuePoints = [
    { label: "Mon", amount: stats.total_revenue * 0.1 },
    { label: "Tue", amount: stats.total_revenue * 0.15 },
    { label: "Wed", amount: stats.total_revenue * 0.22 },
    { label: "Thu", amount: stats.total_revenue * 0.38 },
    { label: "Fri", amount: stats.total_revenue * 0.55 },
    { label: "Sat", amount: stats.total_revenue * 0.72 },
    { label: "Sun", amount: stats.total_revenue }, // Cumulative or daily representation
  ]

  const maxAmount = Math.max(...revenuePoints.map((r) => r.amount), 100)

  return (
    <div className="space-y-6">
      {/* Welcome & Revenue Card */}
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Banner */}
        <div className="flex-1 rounded-3xl bg-gradient-to-r from-sky-600 to-blue-600 p-6 text-white md:p-8 flex flex-col justify-between shadow-md">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Administrative Control</h1>
            <p className="mt-1 text-sm text-sky-100">Oversee deliveries, coordinate rider operations, and manage billing rates.</p>
          </div>
          <div className="mt-6 flex items-center gap-2 text-xs bg-white/10 backdrop-blur-md rounded-xl p-3 w-fit">
            <TrendingUp className="h-4 w-4" />
            <span>Platform operational & fully synced</span>
          </div>
        </div>

        {/* Revenue Counter */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm min-w-[280px] flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <h2 className="text-3xl font-black text-slate-800 mt-1">৳{parseFloat(stats.total_revenue).toFixed(2)}</h2>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <span className="text-lg font-bold">৳</span>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Billing cycle current</span>
            <span className="text-emerald-600 flex items-center gap-0.5">
              <span>+14.2%</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex items-center gap-4 hover-lift">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${card.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.title}</p>
                <p className="text-2xl font-black text-slate-800">{card.value}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Analytics chart */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Revenue Metrics</h2>
            <p className="text-xs text-slate-400">Weekly revenue trend summary</p>
          </div>
        </div>

        {/* Custom SVG Line/Bar Chart */}
        <div className="h-64 w-full pt-4">
          <div className="flex h-48 w-full items-end gap-3 px-2">
            {revenuePoints.map((pt) => {
              const heightPercentage = (pt.amount / maxAmount) * 100
              return (
                <div key={pt.label} className="flex-1 flex flex-col items-center h-full justify-end group">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded-md mb-2 shadow-md">
                    ৳{pt.amount.toFixed(2)}
                  </div>
                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercentage}%` }}
                    className="w-full bg-gradient-to-t from-sky-600 to-sky-400 rounded-t-lg transition-all duration-500 hover:from-sky-500 hover:to-sky-300 shadow-sm"
                  ></div>
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider mt-2">{pt.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
