import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "../api/endpoints.js";
import { errorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Icon from "../components/Icon.jsx";

const RESEND_SECONDS = 60;

function OtpInput({ value, onChange, disabled }) {
    const refs = useRef([]);
    const digits = value.padEnd(6, " ").split("").slice(0, 6);

    const setDigit = (index, digit) => {
        const next = digits.slice();
        next[index] = digit || " ";
        onChange(next.join("").replace(/\s+$/, ""));
    };

    const handleChange = (index, event) => {
        const raw = event.target.value.replace(/\D/g, "");
        if (!raw) return setDigit(index, "");
        if (raw.length > 1) {
            onChange(raw.slice(0, 6));
            refs.current[Math.min(raw.length, 5)]?.focus();
            return;
        }
        setDigit(index, raw);
        if (index < 5) refs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index, event) => {
        if (event.key === "Backspace" && !digits[index].trim() && index > 0) {
            refs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (event) => {
        const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted) {
            event.preventDefault();
            onChange(pasted);
            refs.current[Math.min(pasted.length, 5)]?.focus();
        }
    };

    return (
        <div className="flex justify-between gap-2" onPaste={handlePaste}>
            {digits.map((digit, index) => (
                <input
                    key={index}
                    ref={(el) => (refs.current[index] = el)}
                    className="h-11 w-10 rounded-lg border border-slate-300 text-center text-lg font-semibold focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none sm:h-12 sm:w-12"
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    maxLength={6}
                    value={digit.trim()}
                    disabled={disabled}
                    onChange={(event) => handleChange(index, event)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    autoFocus={index === 0}
                    aria-label={`Digit ${index + 1}`}
                />
            ))}
        </div>
    );
}

export default function LoginPage() {
    const { user, loading, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [step, setStep] = useState("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [busy, setBusy] = useState(false);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    if (!loading && user) return <Navigate to={location.state?.from?.pathname || "/"} replace />;

    const requestOtp = async (event) => {
        event?.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            toast.error("Enter a valid email address");
            return;
        }
        setBusy(true);
        try {
            const result = await authApi.sendOtp(email.trim());
            toast.success(result.message || "Code sent");
            setStep("otp");
            setOtp("");
            setCooldown(RESEND_SECONDS);
        } catch (error) {
            toast.error(errorMessage(error));
        } finally {
            setBusy(false);
        }
    };

    const verify = async (event) => {
        event?.preventDefault();
        if (!/^\d{6}$/.test(otp)) {
            toast.error("Enter the 6-digit code");
            return;
        }
        setBusy(true);
        try {
            const loggedIn = await login(email.trim(), otp);
            toast.success(`Welcome, ${loggedIn.name}`);
            navigate(location.state?.from?.pathname || "/", { replace: true });
        } catch (error) {
            toast.error(errorMessage(error));
            setOtp("");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
            <div className="card w-full max-w-md p-8">
                <div className="mb-6 flex items-center gap-3">
                    <div className="rounded-xl bg-brand-600 p-2 text-white">
                        <Icon name="bell" className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900">Notification Dashboard</h1>
                        <p className="text-sm text-slate-500">Sign in with a one-time code</p>
                    </div>
                </div>

                {step === "email" ? (
                    <form onSubmit={requestOtp} className="space-y-4">
                        <div>
                            <label className="label" htmlFor="email">
                                Work email
                            </label>
                            <input
                                id="email"
                                type="email"
                                className="input"
                                placeholder="you@circolife.com"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                autoComplete="email"
                                autoFocus
                                required
                            />
                        </div>
                        <button type="submit" className="btn-primary w-full" disabled={busy}>
                            {busy ? "Sending code..." : "Send login code"}
                        </button>
                        <p className="text-center text-xs text-slate-500">Only registered Admin and Super Admin accounts can sign in.</p>
                    </form>
                ) : (
                    <form onSubmit={verify} className="space-y-5">
                        <p className="text-sm text-slate-600">
                            Enter the 6-digit code sent to <span className="font-medium text-slate-900">{email}</span>.
                        </p>
                        <OtpInput value={otp} onChange={setOtp} disabled={busy} />
                        <button type="submit" className="btn-primary w-full" disabled={busy || otp.length !== 6}>
                            {busy ? "Verifying..." : "Verify and sign in"}
                        </button>
                        <div className="flex items-center justify-between text-sm">
                            <button
                                type="button"
                                className="cursor-pointer text-slate-500 hover:text-slate-800"
                                onClick={() => {
                                    setStep("email");
                                    setOtp("");
                                }}
                            >
                                Change email
                            </button>
                            <button
                                type="button"
                                className="cursor-pointer font-medium text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-slate-400"
                                onClick={requestOtp}
                                disabled={cooldown > 0 || busy}
                            >
                                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
