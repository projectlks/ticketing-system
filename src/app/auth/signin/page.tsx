"use client";

import { useState } from "react";
import Input from "@/components/Input";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Loading from "@/components/Loading";
import { useRouter } from "next/navigation";
import Script from "next/script";

// import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [data, setData] = useState<{
    email: string;
    password: string;
  }>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<{
    email: string;
    password: string;
    response: string | null;
  }>({
    email: "",
    password: "",
    response: null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
      response: null, // reset correctly
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const validationErrors = { email: "", password: "", response: "" };
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

    setErrors(validationErrors);
    if (!isValid) return;

    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
      callbackUrl: "/helpesk",
    });

    setLoading(false);

    if (res?.error) {
      setErrors((prev) => ({
        ...prev,
        response: res.error,
      }));
    } else if (res?.ok) {
      // localStorage မှာ saved language ရှိရင်ယူမယ်, မရှိရင် default "en"

      // redirect with saved/default language
      router.push(`/helpdesk`);
    }
  };

  return (
    <>
      {loading && <Loading />}

      <main className="bnv-app-bg  bg-[#f3f6fd] relative isolate min-h-screen overflow-hidden text-zinc-900">
        <div className="grid-overlay pointer-events-none absolute inset-0 opacity-60" />

        <section className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
          <header className="mx-auto mb-8 w-full max-w-md text-center">
            <p className="text-[11px] font-semibold tracking-[0.24em] text-zinc-500 uppercase">
              East Wind Myanmar Co., Ltd
            </p>
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
                credentials.{" "}
              </p>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                {/* Email */}
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

                {/* Password */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-zinc-800">
                      Password
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-xs font-semibold tracking-wide text-zinc-600 hover:text-blue-600">
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
                    <p className="mt-1 text-xs text-red-500">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Server Error */}
                {errors.response && (
                  <p className="text-sm text-red-600 text-center">
                    {errors.response}
                  </p>
                )}

                {/* <button
                  type="submit"
                  disabled={loading}
                  className="  bg-[#18181B] text-white mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-80">
                  {loading ? "Signing in..." : "Sign In"}
                </button> */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
    mt-2 inline-flex w-full items-center justify-center gap-2
    rounded-xl px-4 py-3 text-sm font-bold text-white
    bg-linear-to-r from-zinc-800 to-[#18181B]
    transition-all duration-300
    hover:from-zinc-900 hover:to-black
    disabled:cursor-not-allowed disabled:opacity-80
  ">
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            </section>
          </div>

          {/* <footer className="mt-8 text-center text-xs tracking-[0.2em] text-zinc-500 uppercase">
            Copyright (c) 2026 <br /> East Wind Myanmar Co., Ltd.  <br />All rights reserved.
          </footer> */}

          <footer className="mt-10 text-center text-xs text-zinc-500">
            <p>
              {" "}
              Copyright © {new Date().getFullYear()} East Wind Myanmar Co., Ltd.
              All rights reserved.
            </p>
            {/* <p className="mt-1">All rights reserved.</p> */}
          </footer>
        </section>
      </main>
    </>
  );
  // return (
  //   <>
  //     {loading && <Loading />}
  //     <div className="relative min-h-screen flex items-center justify-center p-6 sm:p-0">
  //       <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row sm:p-0 mx-auto">
  //         {/* Left: Form Section */}
  //         <div className="flex flex-col flex-1 w-full bg-white  lg:w-1/2 p-6">
  //           <div className="flex flex-col justify-center w-full max-w-md mx-auto flex-1">
  //             <div className="mb-8">
  //               <h1 className="text-4xl font-semibold text-gray-800  mb-2">
  //                 Sign In
  //               </h1>
  //               <p className="text-sm text-gray-500 ">
  //                 Please sign in to access your tickets and support.
  //               </p>
  //             </div>

  //             <form onSubmit={handleSubmit}>
  //               <div className="space-y-5">
  //                 {/* Email Input */}
  //                 <Input
  //                   type="email"
  //                   id="email"
  //                   name="email"
  //                   placeholder="info@gmail.com"
  //                   value={data.email}
  //                   onChange={handleChange}
  //                   error={!!errors.email}
  //                   label="Email"
  //                   require={true}
  //                   errorMessage={errors.email}
  //                   disable={loading}
  //                 />

  //                 {/* Password Input */}
  //                 <div className="relative">
  //                   <Input
  //                     type={showPassword ? "text" : "password"}
  //                     id="password"
  //                     name="password"
  //                     placeholder="Enter your password"
  //                     value={data.password}
  //                     onChange={handleChange}
  //                     error={!!errors.password}
  //                     label="Password"
  //                     require={true}
  //                     errorMessage={errors.password}
  //                     disable={loading}
  //                   />
  //                 </div>

  //                 {/* General Response Error */}
  //                 {errors.response && (
  //                   <p className="mt-1 text-xs text-red-500 ">
  //                     {errors.response}
  //                   </p>
  //                 )}

  //                 {/* Submit Button */}
  //                 <button
  //                   type="submit"
  //                   disabled={loading}
  //                   className={`mt-6 flex w-full items-center justify-center px-4 py-3 text-sm font-medium rounded-lg shadow-md transition
  //               ${
  //                 loading
  //                   ? "bg-indigo-300 cursor-not-allowed "
  //                   : "bg-indigo-500 hover:bg-indigo-600 "
  //               } text-white`}>
  //                   {loading ? "Signing In..." : "Sign In"}
  //                 </button>
  //               </div>
  //             </form>
  //           </div>
  //         </div>
  //         {/* Right: Visual Section */}{" "}
  //         <div className="hidden lg:flex relative items-center justify-center w-1/2 bg-[#161950] p-10">
  //           {/* Top Grid Image */}{" "}
  //           <div className="absolute top-0 right-0 z-0 w-full max-w-[250px] xl:max-w-[450px]">
  //             {" "}
  //             <Image
  //               src="/grid-01.svg"
  //               alt="grid"
  //               width={450}
  //               height={254}
  //             />{" "}
  //           </div>
  //           {/* Bottom Grid Image */}
  //           <div className="absolute bottom-0 left-0 z-0 w-full max-w-[250px] rotate-180 xl:max-w-[450px]">
  //             {" "}
  //             <Image
  //               src="/grid-01.svg"
  //               alt="grid"
  //               width={450}
  //               height={254}
  //             />{" "}
  //           </div>{" "}
  //           {/* Logo and Description */}{" "}
  //           <div className="flex flex-col items-center w-[80%] z-10">
  //             {" "}
  //             <Link href="/">
  //               <Image
  //                 src="/logo.png"
  //                 alt="Logo"
  //                 width={96}
  //                 height={96}
  //                 className="h-24 w-24"
  //               />{" "}
  //             </Link>
  //             {/* <h3 className="mb-4 text-4xl font-semibold text-center text-white"> East Wind Myanmar Company Limited </h3> */}
  //             <h3 className="mb-4 text-4xl font-semibold text-center text-white">
  //               {" "}
  //               Internal Revenue Department{" "}
  //             </h3>
  //             {/* <p className="text-center text-gray-400 font-semibold"> To be Premier and Preferred Technology Solutions Provider in ICT industry. We create technologies for more efficient business and more comfortable life. </p> */}
  //           </div>{" "}
  //         </div>
  //       </div>
  //     </div>

  //     <Script id="chatwoot">
  //       {`
  //   (function(d,t) {
  //     var BASE_URL="http://192.168.100.27:3000";
  //     var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
  //     g.src=BASE_URL+"/packs/js/sdk.js";
  //     g.async = true;
  //     s.parentNode.insertBefore(g,s);
  //     g.onload=function(){
  //       window.chatwootSDK.run({
  //         websiteToken: '23UsVfLSL7vpy2NSdVaLjSd4',
  //         baseUrl: BASE_URL
  //       })
  //     }
  //   })(document,"script");
  // `}
  //     </Script>

  //     {/* test */}

  //     <main className="bnv-app-bg relative isolate min-h-screen overflow-hidden text-zinc-900">
  //       <div className="grid-overlay pointer-events-none absolute inset-0 opacity-60" />

  //       <section className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
      
  //         <header className="mx-auto mb-8 w-full max-w-md text-center">
  //           <p className="text-[11px] font-semibold tracking-[0.24em] text-zinc-500 uppercase">
  //             East Wind Myanmar Co., Ltd
  //           </p>
  //           <h1 className="mt-3 text-3xl font-semibold text-zinc-950 sm:text-4xl">
  //             Welcome Back
  //           </h1>
  //           <p className="mt-3 text-sm leading-6 text-zinc-600 sm:text-base">
  //             Every Concern Tracked, Owned, and Resolved.{" "}
  //           </p>
  //         </header>

  //         <div className="mx-auto w-full max-w-md">
  //           {/* card */}
  //           <section className="bnv-surface rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.35)] sm:p-10">
  //             <p className="text-xs font-semibold tracking-[0.2em] text-zinc-500 uppercase">
  //               Admin Access
  //             </p>
  //             <h2 className="mt-3 text-2xl font-semibold text-zinc-950">
  //               Sign in to your control panel
  //             </h2>
  //             <p className="mt-2 text-sm text-zinc-600">
  //               Use your authorized credentials to access customer records.
  //             </p>

  //             <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
  //               <div>
  //                 <label
  //                   htmlFor="user-id"
  //                   className="mb-2 block text-sm font-medium text-zinc-800">
  //                   Email{" "}
  //                 </label>
  //                 <input
  //                   id="user-id"
  //                   name="userId"
  //                   type="text"
  //                   autoComplete="username"
  //                   required
  //                   // value={credentials.userId}
  //                   // onChange={(event) =>
  //                   //   updateField("userId", event.target.value)
  //                   // }
  //                   placeholder="admin@bnv.com"
  //                   className="auth-input"
  //                 />
  //               </div>

  //               <div>
  //                 <div className="mb-2 flex items-center justify-between">
  //                   <label
  //                     htmlFor="password"
  //                     className="block text-sm font-medium text-zinc-800">
  //                     Password
  //                   </label>
  //                   <button
  //                     type="button"
  //                     // onClick={togglePasswordVisibility}
  //                     className="text-xs font-semibold tracking-wide text-zinc-600 transition hover:text-blue-600">
  //                     {showPassword ? "Hide" : "Show"}
  //                   </button>
  //                 </div>
  //                 <input
  //                   id="password"
  //                   name="password"
  //                   type={showPassword ? "text" : "password"}
  //                   autoComplete="current-password"
  //                   required
  //                   // value={credentials.password}
  //                   // onChange={(event) =>
  //                   //   updateField("password", event.target.value)
  //                   // }
  //                   placeholder="Enter your password"
  //                   className="auth-input"
  //                 />
  //               </div>

  //               <button
  //                 type="submit"
  //                 // disabled={isSubmitting}
  //                 className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-80">
  //                 {/* {isSubmitting ? (
  //                   <>
  //                     <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  //                     "Signing in..."
  //                   </>
  //                 ) : (
  //                   t("Sign In")
  //                 )} */}
  //                 Sign In
  //               </button>

  //               {/* {statusMessage ? (
  //                 <p className="text-center text-sm text-emerald-700">
  //                   {t(statusMessage)}
  //                 </p>
  //               ) : null} */}
  //             </form>
  //           </section>
  //         </div>

  //         <footer className="mt-8 text-center text-xs tracking-[0.2em] text-zinc-500 uppercase">
  //           {/* {t("Copyright (c) {{year}} BnV. All rights reserved.", {
  //         year: currentYear,
  //       })} */}
  //           Copyright (c) 2026 EWM Co., Ltd. All rights reserved.
  //         </footer>
  //       </section>
  //     </main>
  //   </>
  // );
}
