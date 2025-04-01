import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "../../lib/db";
import User from "@/models/user";
import bcrypt from "bcrypt";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      id: "credentials",
      credentials: {
        user: { label: "User", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        try {
          // Connect to the database
          await connectDB();

          // Find the user by username
          const userFound = await User.findOne({
            user: credentials?.user,
          }).select("+password");

          if (!userFound) {
            throw new Error("Invalid credentials: User not found");
          }

          // Compare password
          const passwordMatch = await bcrypt.compare(
            credentials!.password,
            userFound.password
          );

          if (!passwordMatch) {
            throw new Error("Invalid credentials: Incorrect password");
          }

          // User authorized
          return {
            id: userFound.id,
            user: userFound.user,
            email: userFound.email,
          };
        } catch (error) {
          console.error("Authorize Error:", error);
          throw new Error("An error occurred while authorizing");
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.user = user;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.user) {
        session.user = token.user as any;
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
