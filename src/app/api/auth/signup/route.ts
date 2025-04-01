import { NextResponse } from "next/server";
import User from "@/models/user";
import bcrypt from "bcrypt";
import { connectDB } from "../../lib/db";

export async function POST(request: Request) {
  const { name, user, email, password } = await request.json();
  //console.log(fullname, email, password);
  if (!password || password.length < 6)
    return NextResponse.json(
      {
        message: "Password must be at least 6 characters",
      },
      { status: 400 }
    );
  try {
    await connectDB();
    const userFound = await User.findOne({ email });

    if (userFound)
      return NextResponse.json(
        {
          message: "Email already exists",
        },
        {
          status: 409,
        }
      );
    const hashedPassword = await bcrypt.hash(password, 12);
    const newuser = new User({
      user,
      name,
      email,
      password: hashedPassword,
    });
    const savedUser = await newuser.save();
    console.log(savedUser);
    return NextResponse.json(savedUser);
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      return NextResponse.json(
        {
          message: error.message,
        },
        { status: 400 }
      );
    }
  }
}
