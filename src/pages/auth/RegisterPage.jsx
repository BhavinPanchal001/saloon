import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useToastStore } from "../../stores/toastStore";

const initialFormState = {
  fullName: "",
  email: "",
  phone: "",
  outletName: "",
  password: "",
  confirmPassword: "",
  agreeToTerms: false,
};

export function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!form.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s-]{10,}$/.test(form.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!form.outletName.trim()) {
      newErrors.outletName = "Outlet/salon name is required";
    }

    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!form.agreeToTerms) {
      newErrors.agreeToTerms = "You must agree to the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: undefined }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setIsLoading(true);

    // Simulate API call for registration
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsLoading(false);
    toast.success("Account created successfully! Please verify your email.");
    // Redirect to OTP verification with email in state
    navigate("/verify-otp", { state: { email: form.email } });
  };

  return (
    <div className="min-h-screen px-4 py-8 md:px-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/50 shadow-float backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr]">
        {/* Left Panel - Hero Section */}
        <section className="relative overflow-hidden bg-slate-950 px-8 py-10 text-white md:px-12 md:py-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(221,111,53,0.35),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_26%)]" />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-200">
              GLOWy
            </p>
            <h1 className="mt-6 max-w-lg text-5xl leading-tight md:text-6xl">
              Start your salon journey.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">
              Join thousands of salon owners who trust Glowy to manage their business.
              Create your account today and take the first step towards effortless
              salon management.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ["Easy Setup", "Get started in minutes with our guided onboarding process. No technical expertise required."],
                ["Full Control", "Manage multiple outlets, staff, inventory, and billing from a single dashboard."],
                ["Secure & Reliable", "Your data is encrypted and backed up. We take security seriously."],
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

        {/* Right Panel - Form Section */}
        <section className="flex items-center justify-center px-6 py-10 md:px-10">
          <div className="w-full max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-700">
              Create Account
            </p>
            <h2 className="mt-4 text-4xl text-slate-900">Sign up for Glowy</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Fill in your details below to create your salon management account.
              All fields are required.
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                  {/* Full Name */}
                  <div>
                    <label className="label-text" htmlFor="fullName">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      className={`input-field ${errors.fullName ? "border-rose-300 focus:border-rose-500" : ""}`}
                      placeholder="John Doe"
                      value={form.fullName}
                      onChange={handleChange}
                    />
                    {errors.fullName && (
                      <p className="mt-1 text-xs text-rose-600">{errors.fullName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="label-text" htmlFor="email">
                      Email Address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className={`input-field ${errors.email ? "border-rose-300 focus:border-rose-500" : ""}`}
                      placeholder="name@salon.com"
                      value={form.email}
                      onChange={handleChange}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-rose-600">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="label-text" htmlFor="phone">
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className={`input-field ${errors.phone ? "border-rose-300 focus:border-rose-500" : ""}`}
                      placeholder="+1 234 567 8900"
                      value={form.phone}
                      onChange={handleChange}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>
                    )}
                  </div>

                  {/* Outlet Name */}
                  <div>
                    <label className="label-text" htmlFor="outletName">
                      Salon / Outlet Name
                    </label>
                    <input
                      id="outletName"
                      name="outletName"
                      type="text"
                      className={`input-field ${errors.outletName ? "border-rose-300 focus:border-rose-500" : ""}`}
                      placeholder="Glow Beauty Studio"
                      value={form.outletName}
                      onChange={handleChange}
                    />
                    {errors.outletName && (
                      <p className="mt-1 text-xs text-rose-600">{errors.outletName}</p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <label className="label-text" htmlFor="password">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      className={`input-field ${errors.password ? "border-rose-300 focus:border-rose-500" : ""}`}
                      placeholder="Create a strong password"
                      value={form.password}
                      onChange={handleChange}
                    />
                    {errors.password ? (
                      <p className="mt-1 text-xs text-rose-600">{errors.password}</p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">
                        Must be at least 8 characters
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="label-text" htmlFor="confirmPassword">
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      className={`input-field ${errors.confirmPassword ? "border-rose-300 focus:border-rose-500" : ""}`}
                      placeholder="Confirm your password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-xs text-rose-600">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Terms Checkbox */}
                  <div className="flex items-start gap-3 pt-2">
                    <input
                      id="agreeToTerms"
                      name="agreeToTerms"
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      checked={form.agreeToTerms}
                      onChange={handleChange}
                    />
                    <label htmlFor="agreeToTerms" className="text-sm text-slate-600">
                      I agree to the{" "}
                      <a href="#" className="font-medium text-brand-700 hover:text-brand-800">
                        Terms of Service
                      </a>{" "}
                      and{" "}
                      <a href="#" className="font-medium text-brand-700 hover:text-brand-800">
                        Privacy Policy
                      </a>
                    </label>
                  </div>
                  {errors.agreeToTerms && (
                    <p className="text-xs text-rose-600">{errors.agreeToTerms}</p>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn-primary w-full mt-6"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </button>

                  {/* Sign In Link */}
                  <div className="text-center pt-4">
                    <p className="text-sm text-slate-600">
                      Already have an account?{" "}
                      <Link
                        to="/login"
                        className="font-medium text-brand-700 transition-colors hover:text-brand-800"
                      >
                        Sign in
                      </Link>
                    </p>
                  </div>
                </form>
          </div>
        </section>
      </div>
    </div>
  );
}
