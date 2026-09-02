import { useState, useEffect, useCallback, useId } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Phone,
  User,
  LogOut,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  X,
  ChevronRight,
  Loader2,
  RefreshCw,
  Scissors,
  Award,
  ArrowLeft,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FadeIn, SectionLabel } from "@/components/Section";
import { useCustomerAuth } from "@/hooks/useCustomerAuth";
import {
  isFirebaseConfigured,
  getFirebaseAuth,
  createRecaptchaVerifier,
  type ConfirmationResult,
} from "@/lib/firebase";
import { signInWithPhoneNumber } from "firebase/auth";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";

export const Route = createFileRoute("/my-appointments")({
  component: MyAppointmentsPage,
});

const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:5001/api";

const COUNTRY_CODES = [
  { code: "+91", label: "India (+91)" },
  { code: "+60", label: "Malaysia (+60)" },
  { code: "+1", label: "USA/Canada (+1)" },
  { code: "+44", label: "UK (+44)" },
  { code: "+65", label: "Singapore (+65)" },
  { code: "+971", label: "UAE (+971)" },
  { code: "+61", label: "Australia (+61)" },
];

export default function MyAppointmentsPage() {
  const {
    isAuthenticated,
    user,
    token,
    isLoading: authLoading,
    loginWithPhone,
    registerWithPhone,
    logout,
    refreshProfile,
  } = useCustomerAuth();

  // Auth form states
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [authStep, setAuthStep] = useState<"phone" | "otp" | "register">("phone");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // New customer registration fields
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");

  // Firebase state
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [isDemoOtp, setIsDemoOtp] = useState(false);
  const recaptchaContainerId = useId().replace(/:/g, "_") + "_recaptcha";

  // Dashboard appointments state
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [pastAppointments, setPastAppointments] = useState<any[]>([]);

  // Cancellation modal state
  const [cancellingApt, setCancellingApt] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Load appointments when user is authenticated
  const fetchAppointments = useCallback(async () => {
    if (!token) return;
    setAppointmentsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customers/portal/appointments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) logout();
        return;
      }

      const data = await res.json();
      if (data.success) {
        setUpcomingAppointments(data.upcoming || []);
        setPastAppointments(data.past || []);
      }
    } catch (err) {
      console.error("Error fetching customer appointments:", err);
      toast.error("Unable to load appointments. Please check your connection.");
    } finally {
      setAppointmentsLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAppointments();
      refreshProfile();
    }
  }, [isAuthenticated, fetchAppointments, refreshProfile]);

  // Full clean phone number with country code
  const getFullPhoneNumber = () => {
    const cleanDigits = phoneNumber.replace(/\D/g, "");
    return `${countryCode}${cleanDigits}`;
  };

  // Step 1: Send Verification Code
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 7) {
      toast.error("Please enter a valid phone number.");
      return;
    }

    const fullPhone = getFullPhoneNumber();
    setIsSubmitting(true);

    try {
      const firebaseConfigured = isFirebaseConfigured();
      const auth = getFirebaseAuth();

      if (firebaseConfigured && auth) {
        // Real Firebase Phone Auth
        const verifier = createRecaptchaVerifier(recaptchaContainerId);
        if (!verifier) {
          throw new Error("Could not initialize reCAPTCHA verifier.");
        }

        const confirmation = await signInWithPhoneNumber(auth, fullPhone, verifier);
        setConfirmationResult(confirmation);
        setIsDemoOtp(false);
        setAuthStep("otp");
        setResendCountdown(60);
        toast.success(`Verification code sent to ${fullPhone}`);
      } else {
        // Fallback / Demo mode when Firebase credentials are not yet configured
        console.warn("Firebase credentials not configured. Running in Demo OTP mode.");
        setIsDemoOtp(true);
        setAuthStep("otp");
        setResendCountdown(30);
        toast.success(`Demo Mode: Verification code is 123456`);
      }
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      // If Firebase fails (e.g. invalid phone number format or quota), offer demo fallback
      if (!isFirebaseConfigured() || err.code === "auth/invalid-app-credential" || err.code === "auth/quota-exceeded") {
        setIsDemoOtp(true);
        setAuthStep("otp");
        setResendCountdown(30);
        toast.info("Demo Mode Active: Enter 123456 to test login.");
      } else {
        toast.error(err.message || "Failed to send verification code. Please check the number.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpCode;
    if (!code || code.length !== 6) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    const fullPhone = getFullPhoneNumber();

    try {
      if (!isDemoOtp && confirmationResult) {
        // Real Firebase confirmation check
        await confirmationResult.confirm(code);
      } else {
        // Demo mode check (accepts standard demo code 123456)
        if (code !== "123456") {
          toast.error("Invalid verification code. Please enter 123456 for Demo login.");
          setIsSubmitting(false);
          return;
        }
      }

      // Check if customer exists in our database
      const result = await loginWithPhone(fullPhone);

      if (result.error) {
        toast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      if (result.exists) {
        toast.success("Welcome back! Loading your appointments...");
      } else {
        // First-time guest, ask for name
        setAuthStep("register");
        toast.info("Welcome to Glowy! Please provide your name to finish setup.");
      }
    } catch (err: any) {
      console.error("OTP verification error:", err);
      toast.error(err.message || "Invalid or expired verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 3: Register new customer name
  const handleRegisterProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      toast.error("Please enter your name.");
      return;
    }

    setIsSubmitting(true);
    const fullPhone = getFullPhoneNumber();

    const result = await registerCustomerWithPhone(fullPhone, guestName.trim(), guestEmail.trim());

    setIsSubmitting(false);
    if (result.success) {
      toast.success(`Account created! Welcome, ${guestName.trim()}.`);
    } else {
      toast.error(result.error || "Failed to complete setup.");
    }
  };

  // Handle appointment cancellation
  const handleConfirmCancel = async () => {
    if (!cancellingApt || !token) return;
    setIsCancelling(true);

    try {
      const res = await fetch(
        `${API_BASE}/customers/portal/appointments/${cancellingApt.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: cancelReason }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to cancel appointment.");
        return;
      }

      toast.success("Appointment successfully cancelled.");
      setCancellingApt(null);
      setCancelReason("");
      fetchAppointments();
    } catch (err) {
      console.error("Cancel appointment error:", err);
      toast.error("Network error. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            <CheckCircle2 size={12} /> Confirmed
          </span>
        );
      case "requested":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 border border-amber-500/20">
            <Clock size={12} /> Pending Confirmation
          </span>
        );
      case "in_progress":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 border border-blue-500/20">
            <Scissors size={12} /> In Progress
          </span>
        );
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            <CheckCircle2 size={12} /> Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-700 border border-rose-500/20">
            <X size={12} /> Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-muted text-foreground/70">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        return d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-gold/30 selection:text-primary">
      <Navbar />

      <main className="flex-1 pt-28 md:pt-36 pb-20 px-4 md:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Invisible reCAPTCHA container */}
          <div id={recaptchaContainerId} />

          {/* Section Header */}
          <FadeIn className="text-center mb-10 md:mb-14">
            <SectionLabel>Client Portal</SectionLabel>
            <h1 className="font-display text-3xl md:text-5xl font-light tracking-tight mt-2 text-primary">
              My Appointments
            </h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-md mx-auto">
              View your salon bookings, check reservation status, or reschedule your upcoming glow sessions.
            </p>
          </FadeIn>

          {/* Initial Auth Loading State */}
          {authLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={36} className="animate-spin text-gold" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground mt-4">
                Loading client account...
              </p>
            </div>
          ) : !isAuthenticated ? (
            /* ─────────────────────────────────────────────────────────── */
            /* 1. UNAUTHENTICATED: PHONE OTP LOGIN CARD                    */
            /* ─────────────────────────────────────────────────────────── */
            <FadeIn delay={0.1} className="max-w-md mx-auto">
              <div className="glass rounded-3xl border border-border/60 p-6 md:p-8 shadow-soft relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute -top-16 -right-16 w-32 h-32 bg-gold/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-teal/10 rounded-full blur-3xl pointer-events-none" />

                <AnimatePresence mode="wait">
                  {/* Step 1: Phone Number Entry */}
                  {authStep === "phone" && (
                    <motion.div
                      key="step-phone"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-gold/15 text-gold flex items-center justify-center">
                          <Phone size={20} />
                        </div>
                        <div>
                          <h2 className="text-lg font-medium text-primary">Sign In with Phone</h2>
                          <p className="text-xs text-muted-foreground">
                            We'll send a 6-digit verification code
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleSendOtp} className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
                            Mobile Number
                          </label>
                          <div className="flex gap-2">
                            <select
                              value={countryCode}
                              onChange={(e) => setCountryCode(e.target.value)}
                              className="w-32 rounded-xl border border-input bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                            >
                              {COUNTRY_CODES.map((item) => (
                                <option key={item.code} value={item.code}>
                                  {item.label}
                                </option>
                              ))}
                            </select>

                            <input
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="e.g. 9876543210"
                              autoFocus
                              required
                              className="flex-1 rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1.5">
                            Enter the phone number used when booking your appointment.
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting || !phoneNumber.trim()}
                          className="w-full flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground py-3 text-sm font-medium hover:bg-teal transition-all disabled:opacity-50 cursor-pointer shadow-soft hover:scale-[1.01] active:scale-[0.99] mt-2"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Sending Code...
                            </>
                          ) : (
                            <>
                              Continue <ChevronRight size={16} />
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  )}

                  {/* Step 2: OTP Verification */}
                  {authStep === "otp" && (
                    <motion.div
                      key="step-otp"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25 }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setAuthStep("phone");
                          setOtpCode("");
                        }}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mb-4 transition-colors cursor-pointer"
                      >
                        <ArrowLeft size={14} /> Change phone number
                      </button>

                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-gold/15 text-gold flex items-center justify-center">
                          <Sparkles size={20} />
                        </div>
                        <div>
                          <h2 className="text-lg font-medium text-primary">Verify Code</h2>
                          <p className="text-xs text-muted-foreground">
                            Sent to <span className="font-semibold text-primary">{getFullPhoneNumber()}</span>
                          </p>
                        </div>
                      </div>

                      {isDemoOtp && (
                        <div className="mb-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 flex items-center gap-2">
                          <AlertCircle size={14} className="shrink-0 text-amber-600" />
                          <span>
                            <strong>Demo Mode:</strong> Enter code <strong>123456</strong> to sign in.
                          </span>
                        </div>
                      )}

                      <div className="flex flex-col items-center justify-center py-3">
                        <InputOTP
                          maxLength={6}
                          value={otpCode}
                          onChange={(val) => {
                            setOtpCode(val);
                            if (val.length === 6) {
                              handleVerifyOtp(val);
                            }
                          }}
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} className="w-11 h-12 text-lg rounded-l-xl" />
                            <InputOTPSlot index={1} className="w-11 h-12 text-lg" />
                            <InputOTPSlot index={2} className="w-11 h-12 text-lg" />
                            <InputOTPSlot index={3} className="w-11 h-12 text-lg" />
                            <InputOTPSlot index={4} className="w-11 h-12 text-lg" />
                            <InputOTPSlot index={5} className="w-11 h-12 text-lg rounded-r-xl" />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleVerifyOtp()}
                        disabled={isSubmitting || otpCode.length !== 6}
                        className="w-full flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground py-3 text-sm font-medium hover:bg-teal transition-all disabled:opacity-50 cursor-pointer shadow-soft hover:scale-[1.01] active:scale-[0.99] mt-6"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            Confirm & Sign In <CheckCircle2 size={16} />
                          </>
                        )}
                      </button>

                      <div className="mt-4 text-center">
                        {resendCountdown > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Resend code in <span className="font-semibold text-primary">{resendCountdown}s</span>
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendOtp()}
                            disabled={isSubmitting}
                            className="text-xs text-primary hover:text-gold transition-colors underline underline-offset-4 cursor-pointer"
                          >
                            Resend verification code
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: First-time Guest Setup */}
                  {authStep === "register" && (
                    <motion.div
                      key="step-register"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-2xl bg-gold/15 text-gold flex items-center justify-center">
                          <User size={20} />
                        </div>
                        <div>
                          <h2 className="text-lg font-medium text-primary">One Last Step</h2>
                          <p className="text-xs text-muted-foreground">
                            How should our stylists address you?
                          </p>
                        </div>
                      </div>

                      <form onSubmit={handleRegisterProfile} className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="e.g. Eleanor Vance"
                            autoFocus
                            required
                            className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1.5">
                            Email Address (Optional)
                          </label>
                          <input
                            type="email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="e.g. eleanor@example.com"
                            className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting || !guestName.trim()}
                          className="w-full flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground py-3 text-sm font-medium hover:bg-teal transition-all disabled:opacity-50 cursor-pointer shadow-soft hover:scale-[1.01] active:scale-[0.99] mt-2"
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Setting up account...
                            </>
                          ) : (
                            <>
                              Complete Profile & View Appointments <CheckCircle2 size={16} />
                            </>
                          )}
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeIn>
          ) : (
            /* ─────────────────────────────────────────────────────────── */
            /* 2. AUTHENTICATED: CUSTOMER APPOINTMENTS DASHBOARD           */
            /* ─────────────────────────────────────────────────────────── */
            <div className="space-y-8">
              {/* Profile Bar Card */}
              <FadeIn delay={0.1}>
                <div className="glass rounded-3xl border border-border/60 p-6 md:p-8 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/30 to-gold-soft/10 text-primary flex items-center justify-center border border-gold/40 shadow-sm text-xl font-display font-medium">
                      {user?.name?.charAt(0)?.toUpperCase() || "G"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl md:text-2xl font-light text-primary">
                          Hello, <span className="font-normal">{user?.name || "Valued Guest"}</span>
                        </h2>
                        {user?.loyalty_points !== undefined && user.loyalty_points > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 text-primary text-xs px-2.5 py-0.5 border border-gold/30 font-medium">
                            <Award size={12} className="text-gold" />
                            {user.loyalty_points} Points
                          </span>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>{user?.phone}</span>
                        {user?.email && (
                          <>
                            <span>•</span>
                            <span>{user.email}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href="/#booking"
                      className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-xs md:text-sm font-medium hover:bg-teal transition-all shadow-soft cursor-pointer hover:scale-105 active:scale-95"
                    >
                      <Sparkles size={14} className="text-gold" />
                      Book New Appointment
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setAuthStep("phone");
                        setOtpCode("");
                        setPhoneNumber("");
                        setConfirmationResult(null);
                        toast.info("Signed out successfully.");
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2.5 text-xs md:text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </FadeIn>

              {/* Appointments Tabs & Controls */}
              <FadeIn delay={0.2}>
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("upcoming")}
                      className={`relative px-4 py-2 text-sm font-medium rounded-full transition-all cursor-pointer ${
                        activeTab === "upcoming"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-primary hover:bg-cream"
                      }`}
                    >
                      Upcoming Bookings
                      {upcomingAppointments.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gold text-primary font-semibold">
                          {upcomingAppointments.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("past")}
                      className={`relative px-4 py-2 text-sm font-medium rounded-full transition-all cursor-pointer ${
                        activeTab === "past"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-primary hover:bg-cream"
                      }`}
                    >
                      Past History
                      {pastAppointments.length > 0 && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-muted-foreground/20 text-muted-foreground font-semibold">
                          {pastAppointments.length}
                        </span>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={fetchAppointments}
                    disabled={appointmentsLoading}
                    title="Refresh appointments"
                    className="p-2 rounded-full hover:bg-cream text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                  >
                    <RefreshCw
                      size={16}
                      className={appointmentsLoading ? "animate-spin text-gold" : ""}
                    />
                  </button>
                </div>
              </FadeIn>

              {/* Appointments List */}
              <div className="space-y-4">
                {appointmentsLoading ? (
                  <div className="py-16 text-center">
                    <Loader2 size={32} className="animate-spin mx-auto text-gold" />
                    <p className="text-xs uppercase tracking-widest text-muted-foreground mt-3">
                      Fetching your appointments...
                    </p>
                  </div>
                ) : activeTab === "upcoming" ? (
                  upcomingAppointments.length === 0 ? (
                    <FadeIn className="text-center py-16 px-4 glass rounded-3xl border border-border/50">
                      <div className="w-16 h-16 rounded-full bg-cream mx-auto flex items-center justify-center text-primary/40 mb-4">
                        <CalendarDays size={28} />
                      </div>
                      <h3 className="text-lg font-medium text-primary">No upcoming appointments</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                        You don't have any appointments scheduled right now. Ready for your next salon experience?
                      </p>
                      <a
                        href="/#booking"
                        className="inline-flex items-center gap-2 mt-6 rounded-full bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:bg-teal transition-all shadow-soft cursor-pointer hover:scale-105 active:scale-95"
                      >
                        <Sparkles size={14} className="text-gold" />
                        Book an Appointment
                      </a>
                    </FadeIn>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {upcomingAppointments.map((apt) => (
                        <div
                          key={apt.id}
                          className="glass rounded-2xl border border-border/60 p-5 md:p-6 shadow-sm hover:shadow-soft transition-all duration-300 flex flex-col justify-between"
                        >
                          <div>
                            {/* Status & Service Header */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-gold/15 text-gold flex items-center justify-center shrink-0">
                                  <Scissors size={16} />
                                </div>
                                <div>
                                  <h3 className="text-base font-medium text-primary">
                                    {apt.service?.service_name || apt.notes?.match(/\[Service: ([^\]]+)\]/)?.[1] || "Salon Experience"}
                                  </h3>
                                  {apt.service?.price && (
                                    <p className="text-xs font-semibold text-gold">
                                      RM {Number(apt.service.price).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {getStatusBadge(apt.status)}
                            </div>

                            <div className="gold-divider my-3 opacity-60" />

                            {/* Date, Time & Location Details */}
                            <div className="space-y-2 text-xs md:text-sm text-foreground/80 my-4">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-gold shrink-0" />
                                <span className="font-medium">{formatDate(apt.appointment_date)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-gold shrink-0" />
                                <span>
                                  {apt.start_time} {apt.end_time ? `– ${apt.end_time}` : ""}
                                </span>
                              </div>
                              {apt.outlet && (
                                <div className="flex items-center gap-2">
                                  <MapPin size={14} className="text-gold shrink-0" />
                                  <span>{apt.outlet.name}</span>
                                </div>
                              )}
                              {apt.staff && (
                                <div className="flex items-center gap-2">
                                  <User size={14} className="text-gold shrink-0" />
                                  <span>
                                    Stylist: {apt.staff.first_name} {apt.staff.last_name || ""}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Cancellation Button */}
                          {["requested", "confirmed"].includes(apt.status) && (
                            <div className="pt-3 border-t border-border/40 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setCancellingApt(apt)}
                                className="text-xs text-rose-600 hover:text-rose-700 hover:underline transition-colors cursor-pointer py-1"
                              >
                                Cancel this booking
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                ) : /* Past appointments */
                pastAppointments.length === 0 ? (
                  <FadeIn className="text-center py-16 px-4 glass rounded-3xl border border-border/50">
                    <p className="text-sm text-muted-foreground">No past appointments found.</p>
                  </FadeIn>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pastAppointments.map((apt) => (
                      <div
                        key={apt.id}
                        className="glass rounded-2xl border border-border/40 p-5 opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-sm font-medium text-primary">
                            {apt.service?.service_name || apt.notes?.match(/\[Service: ([^\]]+)\]/)?.[1] || "Salon Experience"}
                          </h3>
                          {getStatusBadge(apt.status)}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-2 mt-2">
                          <Calendar size={12} />
                          {formatDate(apt.appointment_date)} at {apt.start_time}
                        </p>
                        {apt.outlet && (
                          <p className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                            <MapPin size={12} />
                            {apt.outlet.name}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cancellation Confirmation Modal */}
        <AnimatePresence>
          {cancellingApt && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl relative"
              >
                <button
                  type="button"
                  onClick={() => {
                    setCancellingApt(null);
                    setCancelReason("");
                  }}
                  className="absolute top-5 right-5 p-1 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-primary">Cancel Appointment?</h3>
                    <p className="text-xs text-muted-foreground">
                      This will release your reserved time slot.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-cream/60 border border-border/40 text-xs text-foreground/80 mb-4 space-y-1">
                  <p className="font-semibold text-primary">
                    {cancellingApt.service?.service_name || "Salon Appointment"}
                  </p>
                  <p>
                    {formatDate(cancellingApt.appointment_date)} at {cancellingApt.start_time}
                  </p>
                </div>

                <div className="mb-5">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                    Reason for cancellation (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Change of schedule, personal reason, etc."
                    className="w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-2 focus:ring-gold transition-all"
                  />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={() => {
                      setCancellingApt(null);
                      setCancelReason("");
                    }}
                    className="px-4 py-2 rounded-full border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Keep Appointment
                  </button>

                  <button
                    type="button"
                    disabled={isCancelling}
                    onClick={handleConfirmCancel}
                    className="px-5 py-2 rounded-full bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isCancelling ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      "Confirm Cancel"
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
