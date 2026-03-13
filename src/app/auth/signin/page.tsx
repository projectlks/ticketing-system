"use client";

import { useState } from "react";
import type { Route } from "next";

import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { signIn } from "next-auth/react";
import Loading from "@/components/Loading";
import { useRouter, useSearchParams } from "next/navigation";

const MAIN_AGREEMENT_CHECKBOX_ID = "signin-terms-agreement";
const DEFAULT_HELPDESK_CALLBACK_URL = "/helpdesk";

const TERMS_ITEMS = [
  "This ticketing system, including all source code, UI designs, workflows, settings, and documents, is confidential and the exclusive property of East Wind Myanmar Co., Ltd.",
  "Access is permitted only for authorized internal business operations.",
  "No user is allowed to copy, download, screenshot, reproduce, publish, transfer, or reuse any code, UI, data, or document from this system without prior written approval.",
  "Any unauthorized disclosure, duplication, reverse engineering, or misuse of company intellectual property is strictly prohibited.",
  "Violations may result in account suspension, disciplinary action, termination, and legal action under applicable laws and company policy.",
];

const PROHIBITED_ACTIONS = [
  "Copying source code or logic",
  "Copying or recreating UI screens/components",
  "Screenshotting internal pages for external use",
  "Sharing credentials or internal information",
  "Publishing company materials to third parties",
];

function resolveSafeCallbackUrl(rawCallbackUrl: string | null): string {
  if (!rawCallbackUrl) return DEFAULT_HELPDESK_CALLBACK_URL;
  if (!rawCallbackUrl.startsWith("/") || rawCallbackUrl.startsWith("//")) {
    return DEFAULT_HELPDESK_CALLBACK_URL;
  }
  return rawCallbackUrl;
}

function resolveSafePostSignInRoute(rawUrl: string | null | undefined): string {
  if (!rawUrl) return DEFAULT_HELPDESK_CALLBACK_URL;
  if (rawUrl.startsWith("/") && !rawUrl.startsWith("//")) return rawUrl;

  try {
    const parsed = new URL(rawUrl);
    if (parsed.pathname.startsWith("/helpdesk")) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return DEFAULT_HELPDESK_CALLBACK_URL;
  }

  return DEFAULT_HELPDESK_CALLBACK_URL;
}

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Sign in page ပေါ်က main agreement state (submit enable/disable အတွက်သုံး)
  const [hasAgreed, setHasAgreed] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Login form input state
  const [data, setData] = useState<{
    email: string;
    password: string;
  }>({
    email: "",
    password: "",
  });

  // Form validation နှင့် server response error state
  const [errors, setErrors] = useState<{
    email: string;
    password: string;
    agreement: string;
    response: string | null;
  }>({
    email: "",
    password: "",
    agreement: "",
    response: null,
  });

  // Email/Password input ပြောင်းလဲမှုကို update လုပ်ပြီး အမှားစာ reset လုပ်ပေးသည်
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
      response: null,
    }));
  };
  // Agreement checkbox toggle
  const handleAgreementToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setHasAgreed(isChecked);
    setErrors((prev) => ({
      ...prev,
      agreement: "",
      response: null,
    }));
  };

  const openTermsModal = () => {
    setShowTermsModal(true);
  };

  const closeTermsModal = () => {
    setShowTermsModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const validationErrors = {
      email: "",
      password: "",
      agreement: "",
      response: "",
    };

    let isValid = true;

    if (!data.email.trim()) {
      validationErrors.email = "Email is required.";
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(data.email)) {
      validationErrors.email = "Please enter a valid email.";
      isValid = false;
    }

    if (!data.password.trim()) {
      validationErrors.password = "Password is required.";
      isValid = false;
    } else if (data.password.length < 8) {
      validationErrors.password = "Password must be at least 8 characters.";
      isValid = false;
    }

    if (!hasAgreed) {
      validationErrors.agreement =
        "You must agree to the Terms and Conditions before signing in.";
      isValid = false;
    }

    setErrors(validationErrors);
    if (!isValid) return;

    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
      callbackUrl: resolveSafeCallbackUrl(searchParams.get("callbackUrl")),
    });

    setLoading(false);

    if (res?.error) {
      const responseError =
        res.error === "CredentialsSignin" ? "Invalid email or password." : res.error;
      setErrors((prev) => ({
        ...prev,
        response: responseError,
      }));
    } else if (res?.ok) {
      router.push(resolveSafePostSignInRoute(res.url) as Route);
    }
  };

  return (
    <>
      {loading && <Loading />}

      <main className="bnv-app-bg bg-[#f3f6fd] relative isolate min-h-screen overflow-hidden text-zinc-900">
        <div className="grid-overlay pointer-events-none absolute inset-0 opacity-60" />

        <section className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
          <header className="mx-auto mb-8 w-full max-w-md text-center">
            {/* <p className="text-[11px] font-semibold tracking-[0.24em] text-zinc-500 uppercase">
              East Wind Myanmar Co., Ltd
            </p> */}
            <h1 className="mt-3 text-3xl font-semibold text-zinc-950 sm:text-4xl">
              Welcome Back
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
              Every Concern Tracked, Owned, and Resolved.
            </p>
          </header>

          <div className="mx-auto w-full max-w-md">
            <section className="bnv-surface rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.35)] sm:p-10">
              <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">
                Admin Access
              </p>

              <h2 className="mt-3 text-2xl font-semibold text-zinc-950">
                Sign in to your ticketing system
              </h2>

              <p className="mt-2 text-sm text-zinc-600">
                Access the internal ticketing system using your authorized
                credentials.
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                {/* Email input UI */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-800">
                    Email
                  </label>

                  <input
                    name="email"
                    type="email"
                    value={data.email}
                    onChange={handleChange}
                    placeholder="admin@company.com"
                    disabled={loading}
                    className="auth-input"
                  />

                  {errors.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                  )}
                </div>

                {/* Password input UI */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-zinc-800">
                      Password
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={data.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      disabled={loading}
                      className="auth-input pr-10"
                    />
                    <button
                      type="button"
                      onPointerDown={() => setShowPassword(true)}
                      onPointerUp={() => setShowPassword(false)}
                      onPointerLeave={() => setShowPassword(false)}
                      onPointerCancel={() => setShowPassword(false)}
                      onKeyDown={(event) => {
                        if (event.key === " " || event.key === "Enter") {
                          event.preventDefault();
                          setShowPassword(true);
                        }
                      }}
                      onKeyUp={() => setShowPassword(false)}
                      onBlur={() => setShowPassword(false)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-500 hover:text-zinc-700"
                      aria-label="Hold to reveal password"
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeSlashIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {errors.password && (
                    <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                  )}
                </div>

                {/* Agreement checkbox row + terms modal trigger */}
                <div>
                  <div className="flex items-start gap-2 text-sm text-zinc-700">
                    <input
                      id={MAIN_AGREEMENT_CHECKBOX_ID}
                      type="checkbox"
                      checked={hasAgreed}
                      onChange={handleAgreementToggle}
                      disabled={loading}
                      required
                      className="mt-0.5 accent-zinc-900"
                    />
                    <div>
                      <label
                        htmlFor={MAIN_AGREEMENT_CHECKBOX_ID}
                        className="cursor-pointer"
                      >
                        I agree to the{" "}
                      </label>
                      <button
                        type="button"
                        onClick={openTermsModal}
                        className="font-semibold underline underline-offset-2 hover:text-blue-700"
                      >
                        Terms and Conditions
                      </button>
                      <span className="text-zinc-700">.</span>
                      <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                        This is an internal system. Access is restricted to authorized staff.
                      </p>
                    </div>
                  </div>
                  {errors.agreement && (
                    <p className="mt-1 text-xs text-red-500">{errors.agreement}</p>
                  )}
                </div>

                {errors.response && (
                  <p className="text-sm text-red-600 text-center">{errors.response}</p>
                )}

                {/* Sign in button (agreement မလုပ်ရသေးရင် disable) */}
                <button
                  type="submit"
                  disabled={loading || !hasAgreed}
                  className="
    mt-2 inline-flex w-full items-center justify-center gap-2
    rounded-xl px-4 py-3 text-sm font-bold text-white
    bg-linear-to-r from-zinc-800 to-[#18181B]
    transition-all duration-300
    hover:from-zinc-900 hover:to-black
    disabled:cursor-not-allowed disabled:opacity-80
  "
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            </section>
          </div>

          <footer className="mt-10 text-center text-xs text-zinc-500">
            <p>
              Copyright (c) {new Date().getFullYear()} East Wind Myanmar Co., Ltd.
              All rights reserved.
            </p>
          </footer>
        </section>
      </main>

      {showTermsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            closeTermsModal();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-modal-title"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.6)]"
          >
            <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-6 py-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
                  Agreement
                </p>
                <h3
                  id="terms-modal-title"
                  className="mt-1 text-lg font-semibold text-zinc-900"
                >
                  Terms and Conditions
                </h3>
              </div>
              <button
                type="button"
                onClick={closeTermsModal}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                Close
              </button>
            </header>

            <div className="max-h-[62vh] space-y-4 overflow-y-auto px-6 py-5">
              <p className="text-sm leading-6 text-zinc-700">
                Please review the following legal and confidentiality terms carefully.
              </p>

              <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-zinc-700">
                {TERMS_ITEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
                <p className="text-xs font-semibold tracking-[0.08em] text-zinc-700 uppercase">
                  Strictly Prohibited
                </p>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-5 text-zinc-600">
                  {PROHIBITED_ACTIONS.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            </div>

            <footer className="border-t border-zinc-200 px-6 py-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={closeTermsModal}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Close
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}








