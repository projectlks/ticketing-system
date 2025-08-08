import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/libs/prisma";
import { z } from "zod";

const FormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request body using zod schema (input validation)
    const { name, email, password } = FormSchema.parse(body);

    // User ရှိပြီးသားရှိမရှိ စစ်ဆေးခြင်း
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    // Password ကို bcrypt ဖြင့် hash ပြုလုပ်ခြင်း
    const hashedPassword = await bcrypt.hash(password, 10);

    // Verification token များ ဖန်တီးခြင်း
    // const token = randomBytes(32).toString("hex");

    // User အသစ်ဖန်တီးပြီး emailVerified ကို null ထားပြီး verification token ကို သိမ်းဆည်းခြင်း
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // User ဖန်တီးပြီး email verify မလုပ်ခင်ဆို message ပြန်ပေးခြင်း
    return NextResponse.json(
      { message: "User created, please verify your email." },
      { status: 201 }
    );
  } catch (error) {
    // Input validation error ရှိပါက
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // အခြားအမှားများကို console log ထဲသို့ ထည့်ပြီး client သို့ error message ပြန်ပေးခြင်း
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
