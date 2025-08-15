"use client";

import { useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Input from "@/components/Input";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Loading from "@/components/Loading";

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
    response: string | null;  // <-- allow null here
  }>({
    email: "",
    password: "",
    response: null,  // start with null
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "", // Clear field-specific error on input
      response: "", // Clear general response error on any input
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
    }

    if (data.password.length < 8) {
      validationErrors.password = "Password must be at least 6 characters.";
      isValid = false;
    }

    setErrors(validationErrors);
    if (!isValid) return;

    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email: data.email,
      password: data.password,
    });

    setLoading(false);

    if (res?.error) {
      setErrors((prev) => ({
        ...prev,
        response: res.error,
      }));
    } else if (res?.ok) {
      window.location.href = "/main/dashboard";
    }
  };

  return (

    <>


      {loading && <Loading />}
      <div className="relative min-h-screen flex items-center justify-center p-6 sm:p-0">
        <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row sm:p-0 mx-auto">
          {/* Left: Form Section */}
          <div className="flex flex-col flex-1 w-full lg:w-1/2 p-6">
            <div className="flex flex-col justify-center w-full max-w-md mx-auto flex-1">
              <div className="mb-8">
                <h1 className="text-4xl font-semibold text-gray-800 mb-2">Sign In</h1>
                <p className="text-sm text-gray-500">
                  Please sign in to access your tickets and support.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <input
                  type="hidden"
                  name="_token"
                  value="fXk38xbC9KuX7GSW67AIZ4QRUvv5vx1buNSaV3Bu"
                />

                <div className="space-y-5">
                  {/* Email Input */}
                  <div>
                    <label
                      htmlFor="email"
                      className="block mb-1.5 text-sm font-medium text-gray-700"
                    >
                      Email <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="info@gmail.com"
                      value={data.email}
                      onChange={handleChange}
                      error={!!errors.email}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                    )}
                  </div>

                  {/* Password Input */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block mb-1.5 text-sm font-medium text-gray-700"
                    >
                      Password <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        placeholder="Enter your password"
                        value={data.password}
                        onChange={handleChange}
                        error={!!errors.password}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 transform text-gray-500 focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeSlashIcon className="w-5 h-5" />
                        ) : (
                          <EyeIcon className="w-5 h-5" />
                        )}
                      </button>
                    </div>

                    {errors.password && (
                      <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                    )}
                  </div>

                  {/* General Response Error */}
                  {errors.response && (
                    <p className="mt-1 text-xs text-red-500">{errors.response}</p>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`mt-6 flex w-full items-center justify-center px-4 py-3 text-sm font-medium text-white rounded-lg shadow-md transition
                    ${loading
                        ? "bg-indigo-300 cursor-not-allowed"
                        : "bg-indigo-500 hover:bg-indigo-600"
                      }`}
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Visual Section */}
          <div className="hidden lg:flex relative items-center justify-center w-1/2 bg-[#161950] p-10">
            {/* Top Grid Image */}
            <div className="absolute top-0 right-0 z-0 w-full max-w-[250px] xl:max-w-[450px]">
              <Image src="/grid-01.svg" alt="grid" width={450} height={254} />
            </div>

            {/* Bottom Grid Image */}
            <div className="absolute bottom-0 left-0 z-0 w-full max-w-[250px] rotate-180 xl:max-w-[450px]">
              <Image src="/grid-01.svg" alt="grid" width={450} height={254} />
            </div>

            {/* Logo and Description */}
            <div className="flex flex-col items-center w-[80%] z-10">
              <Link href="/">
                <Image
                  src="/logo.png"
                  alt="Logo"
                  width={96}
                  height={96}
                  className="h-24 w-24"
                />
              </Link>

              <h3 className="mb-4 text-4xl font-semibold text-center text-white">
                East Wind Myanmar Company Limited
              </h3>

              <p className="text-center text-gray-400 font-semibold">
                To be Premier and Preferred Technology Solutions Provider in ICT
                industry. We create technologies for more efficient business and
                more comfortable life.
              </p>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
