import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useToastStore } from "../../stores/toastStore";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const toast = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);

    // Simulate API call for password reset
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
    setIsSubmitted(true);
    toast.success("Password reset instructions sent to your email");
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
              Reset your password.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">
              Forgot your password? No worries. Enter your email address and we'll
              send you instructions to reset your password and regain access to your
              salon cockpit.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ["Secure Recovery", "Password reset links are encrypted and expire after 24 hours for your security."],
                ["Email Verification", "We verify your identity by sending a confirmation link to your registered email."],
                ["Quick Access", "Once reset, you can immediately log in with your new password."],
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
              Password Recovery
            </p>
            <h2 className="mt-4 text-4xl text-slate-900">Forgot your password?</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Enter your email address below and we'll send you a link to reset your
              password and get you back into your account.
            </p>

            {!isSubmitted ? (
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending instructions..." : "Send Reset Link"}
                </button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm font-medium text-brand-700 transition-colors hover:text-brand-800"
                  >
                    ← Back to Sign In
                  </Link>
                </div>
              </form>
            ) : (
              <div className="mt-8 space-y-5">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                      <svg
                        className="h-5 w-5 text-emerald-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-emerald-900">Check your email</h3>
                      <p className="text-sm text-emerald-700">
                        We've sent password reset instructions to {email}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-slate-600">
                  Didn't receive the email? Check your spam folder or{" "}
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="font-medium text-brand-700 transition-colors hover:text-brand-800"
                  >
                    try again
                  </button>
                  .
                </p>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center rounded-2xl border border-navy-200 bg-white px-6 py-3 text-sm font-semibold text-navy-700 transition-all hover:bg-navy-50"
                  >
                    Back to Sign In
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
