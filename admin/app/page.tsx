"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken")
    const userStr = localStorage.getItem("user")
    if (accessToken && userStr) {
      const user = JSON.parse(userStr)
      if (user.role?.name === "SUPER_ADMIN" || user.role?.name === "ADMIN") {
        router.push("/dashboard")
        return
      }
    }
    router.push("/login")
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
      <div className="text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent mx-auto"></div>
        <h2 className="mt-4 text-lg font-semibold tracking-wide text-slate-300">Loading Admin Console...</h2>
      </div>
    </div>
  )
}
