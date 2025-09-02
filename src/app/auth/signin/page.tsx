"use client";

import { useState } from "react";
import Input from "@/components/Input";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import Loading from "@/components/Loading";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/app/ThemeToggle";
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
    });

    setLoading(false);

    if (res?.error) {
      setErrors((prev) => ({
        ...prev,
        response: res.error,
      }));
    } else if (res?.ok) {
      // localStorage မှာ saved language ရှိရင်ယူမယ်, မရှိရင် default "en"
      const savedLang = localStorage.getItem("lang") || "en";

      // redirect with saved/default language
      router.push(`/lang/${savedLang}/main/dashboard`);
    }
  };

  return (
    <>
      {loading && <Loading />}
      <div className="relative min-h-screen flex items-center justify-center p-6 sm:p-0">
        <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row sm:p-0 mx-auto">
          {/* Left: Form Section */}
          <div className="flex flex-col flex-1 w-full bg-white dark:bg-gray-800 lg:w-1/2 p-6">
            <div className="flex flex-col justify-center w-full max-w-md mx-auto flex-1">
              <div className="mb-8">
                <h1 className="text-4xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                  Sign In
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  Please sign in to access your tickets and support.
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-5">
                  {/* Email Input */}
                  <Input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="info@gmail.com"
                    value={data.email}
                    onChange={handleChange}
                    error={!!errors.email}
                    label="Email"
                    require={true}
                    errorMessage={errors.email}
                    disable={loading}
                  />

                  {/* Password Input */}
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      placeholder="Enter your password"
                      value={data.password}
                      onChange={handleChange}
                      error={!!errors.password}
                      label="Password"
                      require={true}
                      errorMessage={errors.password}
                      disable={loading}
                    />
                  </div>

                  {/* General Response Error */}
                  {errors.response && (
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.response}</p>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`mt-6 flex w-full items-center justify-center px-4 py-3 text-sm font-medium rounded-lg shadow-md transition
                ${loading
                        ? "bg-indigo-300 cursor-not-allowed dark:bg-indigo-500/60"
                        : "bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-500"
                      } text-white`}
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right: Visual Section */} <div className="hidden lg:flex relative items-center justify-center w-1/2 bg-[#161950] p-10"> {/* Top Grid Image */} <div className="absolute top-0 right-0 z-0 w-full max-w-[250px] xl:max-w-[450px]"> <Image src="/grid-01.svg" alt="grid" width={450} height={254} /> </div> {/* Bottom Grid Image */} <div className="absolute bottom-0 left-0 z-0 w-full max-w-[250px] rotate-180 xl:max-w-[450px]"> <Image src="/grid-01.svg" alt="grid" width={450} height={254} /> </div> {/* Logo and Description */} <div className="flex flex-col items-center w-[80%] z-10"> <Link href="/"> <Image src="/logo.png" alt="Logo" width={96} height={96} className="h-24 w-24" /> </Link> <h3 className="mb-4 text-4xl font-semibold text-center text-white"> East Wind Myanmar Company Limited </h3> <p className="text-center text-gray-400 font-semibold"> To be Premier and Preferred Technology Solutions Provider in ICT industry. We create technologies for more efficient business and more comfortable life. </p> </div> </div>
        </div>
      </div>

      <div className=" absolute top-5 right-5 ">
        <ThemeToggle />
      </div>

    </>
  );
}
