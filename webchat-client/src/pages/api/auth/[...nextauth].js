import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google";
import excuteQuery from "@/lib/db"

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24,
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      //TODO: set account
      try {
        const result = await excuteQuery({
          query: "REPLACE INTO user (id, name, email, image) VALUES (?, ?, ?, ?)",
          values: [user.id, user.name, user.email, user.image]
        });
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    },
    jwt: ({ token, user }) => {
      if (user) {
        token.user = user
      }
      return Promise.resolve(token)
    },
    async session({ session, token, user }) {
      session.user.id = user?.id ? user.id : token.user.id
      return session;
    },
  }
}
export default NextAuth(authOptions)