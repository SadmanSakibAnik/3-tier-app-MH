"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { Users, Search, Mail, Phone, Calendar, UserCheck } from "lucide-react"

export default function AdminUsersDirectory() {
  const [searchQuery, setSearchQuery] = useState("")
  const [page, setPage] = useState(1)
  const limit = 10

  // Fetch users list from backend
  const { data, isLoading, isError } = useQuery({
    queryKey: ["adminUsers", page, searchQuery],
    queryFn: async () => {
      const response = await api.get("/admin/users", {
        params: { page, limit, search: searchQuery },
      })
      return response.data
    },
  })

  const users = data?.data || []
  const totalCount = data?.total || 0

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
            <Users className="h-6 w-6 text-sky-500" />
            <span>Users Directory</span>
          </h1>
          <p className="text-sm text-slate-400">View and audit all registered customer profiles and platform administrators.</p>
        </div>
      </div>

      {/* Directory Box */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Search controls */}
        <div className="border-b border-slate-100 p-5">
          <div className="relative flex-1 max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Search className="h-4 w-4" /></div>
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-sky-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent"></div>
          </div>
        ) : isError ? (
          <div className="text-center py-12 text-red-500 font-bold">Failed to load user directory.</div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-slate-400 font-medium">No users found in directory matching search criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-4">Profile</th>
                  <th className="p-4">Contact Info</th>
                  <th className="p-4">Role System</th>
                  <th className="p-4">Date Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-slate-50/20 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{user.name}</div>
                        <div className="text-[10px] text-slate-400">UUID: {user.id.slice(0, 8)}...</div>
                      </div>
                    </td>
                    <td className="p-4 space-y-1">
                      <div className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-400" /> {user.email}</div>
                      <div className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" /> {user.phone || "--"}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-2xs font-extrabold uppercase tracking-wider ${
                        user.role?.name === "SUPER_ADMIN" ? "bg-red-50 text-red-700 border-red-200" :
                        user.role?.name === "ADMIN" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        "bg-slate-50 text-slate-700 border-slate-200"
                      }`}>
                        {user.role?.name || "CUSTOMER"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(user.created_at).toLocaleDateString()}</span>
                      </div>
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
    </div>
  )
}
