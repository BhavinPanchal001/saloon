import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

const demoCredentials = {
  admin: {
    email: "admin@glowy.com",
    password: "glowy123",
  },
  outlet_manager: {
    email: "manager@glowy.com",
    password: "glowy123",
  },
};

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const loginError = useAuthStore((state) => state.loginError);
  const clearLoginError = useAuthStore((state) => state.clearLoginError);

  const [form, setForm] = useState({
    email: demoCredentials.admin.email,
    password: demoCredentials.admin.password,
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    clearLoginError();
    setForm((current) => ({ ...current, [name]: value }));
  };

  const applyDemo = (role) => {
    clearLoginError();
    setForm(demoCredentials[role]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const result = await login(form);
      navigate(result.redirectTo);
    } catch (error) {
      return error;
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 md:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/50 shadow-float backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden bg-slate-950 px-8 py-10 text-white md:px-12 md:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(221,111,53,0.35),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_26%)]" />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
              GLOWy
            </p>
            <h1 className="mt-6 max-w-lg text-5xl leading-tight md:text-6xl">
              Glow to go with Glowy.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">
              A multi-outlet salon management POS with branch-sensitive access, inventory-aware
              services, staff-linked billing, and payroll-ready operational flows.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ["Role-aware routing", "Super Admin sees the whole network. Outlet Managers stay scoped."],
                ["Mocked async APIs", "Promise-based data lets us build UI now and connect Supabase later."],
                ["Retail + services", "Catalog, POS, expenses, HR, and payroll all sit on one frontend foundation."],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur"
                >
                  <h2 className="text-xl text-white">{title}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10 md:px-10">
          <div className="w-full max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-700">
              Authentication
            </p>
            <h2 className="mt-4 text-4xl text-slate-900">Sign in to your salon cockpit</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Use the demo accounts below or type any email containing
              <span className="font-semibold text-brand-700"> admin </span>
              to simulate a Super Admin.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="soft-panel px-4 py-4 text-left"
                onClick={() => applyDemo("admin")}
              >
                <p className="text-sm font-semibold text-slate-900">Super Admin Demo</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                  admin@glowy.com
                </p>
              </button>
              <button
                type="button"
                className="soft-panel px-4 py-4 text-left"
                onClick={() => applyDemo("outlet_manager")}
              >
                <p className="text-sm font-semibold text-slate-900">Outlet Manager Demo</p>
                <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                  manager@glowy.com
                </p>
              </button>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="label-text" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="input-field"
                  placeholder="name@glowy.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="label-text" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="input-field"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                />
              </div>

              {loginError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {loginError}
                </div>
              ) : null}

              <button type="submit" className="btn-primary w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Enter Glowy"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
