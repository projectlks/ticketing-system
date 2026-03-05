"use client";

import { useState } from "react";

import { signIn } from "next-auth/react";
import Loading from "@/components/Loading";
import { useRouter } from "next/navigation";

// Terms modal ထဲမှာ အဓိကပြမယ့် စည်းကမ်းချက်များ
const TERMS_ITEMS = [
  "This ticketing system, including all source code, UI designs, workflows, settings, and documents, is confidential and the exclusive property of East Wind Myanmar Co., Ltd.",
  "Access is permitted only for authorized internal business operations.",
  "No user is allowed to copy, download, screenshot, reproduce, publish, transfer, or reuse any code, UI, data, or document from this system without prior written approval.",
  "Any unauthorized disclosure, duplication, reverse engineering, or misuse of company intellectual property is strictly prohibited.",
  "Violations may result in account suspension, disciplinary action, termination, and legal action under applicable laws and company policy.",
];

// Terms modal ထဲမှာ အထူးတားမြစ်ထားတဲ့ လုပ်ဆောင်ချက်များ
const PROHIBITED_ACTIONS = [
  "Copying source code or logic",
  "Copying or recreating UI screens/components",
  "Screenshotting internal pages for external use",
  "Sharing credentials or internal information",
  "Publishing company materials to third parties",
];

const TERMS_AGREEMENT_STORAGE_KEY = "ticketing_terms_agreed";
const MAIN_AGREEMENT_CHECKBOX_ID = "signin-terms-agreement";
const MODAL_AGREEMENT_CHECKBOX_ID = "terms-modal-agreement";

function getInitialAgreementState(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(TERMS_AGREEMENT_STORAGE_KEY) === "true";
}

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Terms popup ဖွင့်/ပိတ် နှင့် popup ထဲက agreement checkbox state
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [modalAgreementChecked, setModalAgreementChecked] = useState(false);

  // Sign in page ပေါ်က main agreement state (submit enable/disable အတွက်သုံး)
  const [hasAgreed, setHasAgreed] = useState(getInitialAgreementState);
  const router = useRouter();

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

  // Terms link/checkbox click လုပ်ချိန် popup ဖွင့်
  const openTermsModal = () => {
    setModalAgreementChecked(hasAgreed);
    setErrors((prev) => ({
      ...prev,
      agreement: "",
    }));
    setShowTermsModal(true);
  };

  // Main checkbox ကို tick/un-tick လုပ်ချိန် behavior
  // tick = modal ဖွင့်, untick = agreement remove
  const handleMainAgreementToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;

    if (!isChecked) {
      setHasAgreed(false);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(TERMS_AGREEMENT_STORAGE_KEY);
      }
      setErrors((prev) => ({
        ...prev,
        agreement: "",
      }));
      return;
    }

    openTermsModal();
  };

  // Popup ထဲက "I Agree and Continue" နှိပ်ချိန် main agreement ကို confirm လုပ်
  const handleAgreeAndContinue = () => {
    if (!modalAgreementChecked) return;

    setHasAgreed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(TERMS_AGREEMENT_STORAGE_KEY, "true");
    }

    setErrors((prev) => ({
      ...prev,
      agreement: "",
      response: null,
    }));

    setShowTermsModal(false);
  };

  // Sign in submit flow + validation
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
      callbackUrl: "/helpdesk",
    });

    setLoading(false);

    if (res?.error) {
      setErrors((prev) => ({
        ...prev,
        response: res.error,
      }));
    } else if (res?.ok) {
      router.push(`/helpdesk`);
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

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs font-semibold tracking-wide text-zinc-600 hover:text-blue-600"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>

                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={data.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    disabled={loading}
                    className="auth-input"
                  />

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
                      onChange={handleMainAgreementToggle}
                      disabled={loading}
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
        // Terms popup overlay + background blur
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="terms-modal-title"
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.6)]"
          >
            <header className="flex items-start justify-between gap-3 border-b border-zinc-200 px-6 py-4">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.14em] text-zinc-500 uppercase">
                  Agreement Required
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
                onClick={() => setShowTermsModal(false)}
                className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
              >
                Close
              </button>
            </header>

            {/* Terms content area (scrollable) */}
            <div className="max-h-[62vh] space-y-4 overflow-y-auto px-6 py-5">
              <p className="text-sm leading-6 text-zinc-700">
                Please review the following legal and confidentiality terms carefully.
                You must accept these terms before accessing the system.
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

            {/* Modal footer: agreement checkbox + action buttons */}
            <footer className="border-t border-zinc-200 px-6 py-4">
              <label
                htmlFor={MODAL_AGREEMENT_CHECKBOX_ID}
                className="flex cursor-pointer items-start gap-2 text-sm text-zinc-700"
              >
                <input
                  id={MODAL_AGREEMENT_CHECKBOX_ID}
                  type="checkbox"
                  checked={modalAgreementChecked}
                  onChange={(e) => setModalAgreementChecked(e.target.checked)}
                  className="mt-0.5 accent-zinc-900"
                />
                <span>I have read and agree to all Terms and Conditions above.</span>
              </label>

              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-300 px-3.5 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAgreeAndContinue}
                  disabled={!modalAgreementChecked}
                  className="inline-flex items-center justify-center rounded-lg bg-linear-to-r from-zinc-800 to-[#18181B] px-3.5 py-2 text-sm font-semibold text-white transition hover:from-zinc-900 hover:to-black disabled:cursor-not-allowed disabled:opacity-70"
                >
                  I Agree and Continue
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
