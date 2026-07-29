import { BrandPanel } from "./components/BrandPanel"
import { OwnerSignInCard } from "./components/OwnerSignInCard"
import { OwnerDashboard } from "./dashboard/OwnerDashboard"
import "./dashboard/dashboard.css"

export function App() {
  if (window.location.pathname.startsWith("/dashboard")) {
    return <OwnerDashboard />
  }

  return (
    <main className="platform-signin-shell">
      <BrandPanel />
      <section className="owner-auth-region" aria-label="تسجيل دخول إدارة المنصة">
        <OwnerSignInCard />
      </section>
    </main>
  )
}
