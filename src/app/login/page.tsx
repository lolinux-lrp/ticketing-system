"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [magicLoading, setMagicLoading] = useState(false);

    async function handlePasswordSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setMessage("");
        setLoading(true);

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        setLoading(false);

        if (result?.error) {
            setError("Invalid email or password.");
            return;
        }

        router.push("/dashboard");
    }

    async function handleMagicLink(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setMessage("");
        setMagicLoading(true);

        const result = await signIn("email", {
            email,
            redirect: false,
        });

        setMagicLoading(false);

        if (result?.error) {
            setError(result.error);
            return;
        }

        setMessage("Check your email for the magic link!");
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow">
                <h1 className="text-2xl font-semibold mb-6 text-center">Log in</h1>

                {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}
                {message && <p className="text-green-600 text-sm mb-4 text-center">{message}</p>}

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Password (Optional for Magic Link)</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="submit"
                            disabled={loading || !password}
                            className="flex-1 bg-blue-600 text-white rounded py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? "Logging in..." : "Log in"}
                        </button>
                        <button
                            type="button"
                            onClick={handleMagicLink}
                            disabled={magicLoading || !email}
                            className="flex-1 border border-blue-600 text-blue-600 rounded py-2 font-medium hover:bg-blue-50 disabled:opacity-50"
                        >
                            {magicLoading ? "Sending..." : "Send Magic Link"}
                        </button>
                    </div>
                </form>

                <p className="text-sm text-center mt-6 text-gray-600">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="text-blue-600 hover:underline">
                        Sign up
                    </Link>
                </p>
            </div>
        </div>
    );
}