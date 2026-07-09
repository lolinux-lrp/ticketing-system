"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState(!email || !token ? "Invalid or missing link parameters." : "");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setMessage("");

        if (!email || !token) {
            setError("Invalid or missing link parameters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/set-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, token, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong.");
                setLoading(false);
                return;
            }

            setMessage("Password set successfully! Redirecting to login...");
            
            setTimeout(() => {
                router.push("/login");
            }, 2000);
        } catch {
            setError("Something went wrong. Please try again.");
            setLoading(false);
        }
    }

    return (
        <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow">
            <h1 className="text-2xl font-semibold mb-6 text-center">Set Your Password</h1>

            {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
            {message && <p className="text-green-600 text-sm mb-4 text-center">{message}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                        type="email"
                        value={email || ""}
                        disabled
                        className="w-full border rounded px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">New Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={!email || !token || !!message}
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">Confirm Password</label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                        disabled={!email || !token || !!message}
                        className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !email || !token || !!message}
                    className="w-full bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Saving..." : "Set Password"}
                </button>
            </form>

            <p className="text-sm text-center mt-6 text-gray-600">
                <Link href="/login" className="text-blue-600 hover:underline">
                    Back to Log in
                </Link>
            </p>
        </div>
    );
}

export default function SetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Suspense fallback={<div className="w-full max-w-sm bg-white p-8 rounded-lg shadow text-center">Loading...</div>}>
                <SetPasswordForm />
            </Suspense>
        </div>
    );
}
