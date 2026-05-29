import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useToastStore } from "../../stores/toastStore";
import { useAuthStore } from "../../stores/authStore";

export function OTPVerificationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastStore();
  const verifyOTP = useAuthStore((state) => state.verifyOTP);
  const resendOTP = useAuthStore((state) => state.resendOTP);
  const pendingEmail = useAuthStore((state) => state.pendingEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const inputRefs = useRef([]);

  const email = location.state?.email || pendingEmail || "your email";
  const twoFaMethod = location.state?.twoFaMethod || "email";
  const isTOTP = twoFaMethod === "totp";

  // Countdown timer for resend
  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only keep last digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (index === 5 && value) {
      const completeOtp = [...newOtp];
      completeOtp[5] = value.slice(-1);
      const otpString = completeOtp.join("");
      if (otpString.length === 6) {
        setTimeout(() => handleVerify(otpString), 200);
      }
    }
  };

  const handleKeyDown = (index, event) => {
    // Handle backspace
    if (event.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // If current input is empty, focus previous
        inputRefs.current[index - 1]?.focus();
      } else {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = "";
        setOtp(newOtp);
      }
    }

    // Handle arrow keys
    if (event.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);

    if (pastedData) {
      const newOtp = [...otp];
      pastedData.split("").forEach((digit, index) => {
        if (index < 6) newOtp[index] = digit;
      });
      setOtp(newOtp);

      // Focus the appropriate input
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();

      // Auto-submit if complete
      if (pastedData.length === 6) {
        setTimeout(() => handleVerify(pastedData), 200);
      }
    }
  };

  const handleVerify = async (otpString = null) => {
    const codeToVerify = otpString || otp.join("");

    if (codeToVerify.length !== 6) {
      setOtpError("Please enter all 6 digits.");
      return;
    }

    setIsLoading(true);
    setOtpError(null);

    try {
      const result = await verifyOTP({ email, otp: codeToVerify });
      toast.success("Verification successful!");
      navigate(result.redirectTo);
    } catch (error) {
      setOtpError(error.message || "Invalid verification code. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;

    setIsResending(true);
    setOtpError(null);

    try {
      await resendOTP(email);
      setTimer(60);
      toast.success(`New verification code sent to ${email}`);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast.error(error.message || "Could not resend code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    handleVerify();
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
              Secure your account.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">
              Two-factor authentication adds an extra layer of security to your salon
              management system. Verify your identity with a one-time code sent to
              your device.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                ["Enhanced Security", "2FA prevents unauthorized access even if your password is compromised."],
                ["Easy Verification", "Receive codes via email or SMS. Quick and hassle-free authentication."],
                ["Trusted Access", "Only verified devices can access your sensitive salon data."],
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
              Two-Factor Authentication
            </p>
            <h2 className="mt-4 text-4xl text-slate-900">Verify your identity</h2>
            {isTOTP ? (
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Open your authenticator app (Google Authenticator, Authy, etc.) and enter the{" "}
                <span className="font-semibold text-slate-900">6-digit code</span> for Glowy Saloon.
              </p>
            ) : (
              <p className="mt-4 text-sm leading-7 text-slate-600">
                We've sent a 6-digit verification code to{" "}
                <span className="font-semibold text-slate-900">{email}</span>. Enter the
                code below to continue.
              </p>
            )}

            <form className="mt-8" onSubmit={handleSubmit}>
              {/* OTP Input Fields */}
              <div className="flex justify-center gap-3">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    disabled={isLoading}
                    className="h-14 w-12 rounded-2xl border-2 border-slate-200 bg-white text-center text-2xl font-bold text-slate-900 transition-all focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 disabled:opacity-50 sm:h-16 sm:w-14"
                  />
                ))}
              </div>

              {/* Timer and Resend — email only */}
              {!isTOTP && (
                <div className="mt-6 text-center">
                  {timer > 0 ? (
                    <p className="text-sm text-slate-500">
                      Resend code in{" "}
                      <span className="font-semibold text-brand-700">
                        {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
                      </span>
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={isResending}
                      className="text-sm font-medium text-brand-700 transition-colors hover:text-brand-800 disabled:opacity-50"
                    >
                      {isResending ? "Sending..." : "Didn't receive it? Resend code"}
                    </button>
                  )}
                </div>
              )}

              {otpError ? (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {otpError}
                </div>
              ) : null}

              {/* Verify Button */}
              <button
                type="submit"
                className="btn-primary mt-8 w-full"
                disabled={isLoading || otp.join("").length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify & Continue"}
              </button>

              {/* Alternative Options */}
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500">
                  Wrong email?{" "}
                  <Link
                    to="/login"
                    className="font-medium text-brand-700 transition-colors hover:text-brand-800"
                  >
                    Start over
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
