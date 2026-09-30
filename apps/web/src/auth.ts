import { PrismaAdapter } from '@auth/prisma-adapter';
import { database } from '@wakeops/database';
import type { Adapter } from 'next-auth/adapters';
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const prismaAdapter = PrismaAdapter(database);
const tokenMinimizingAdapter: Adapter = {
  ...prismaAdapter,
  // Store identity only
  async linkAccount(account) {
    const identityAccount = { ...account };
    delete identityAccount.access_token;
    delete identityAccount.refresh_token;
    delete identityAccount.id_token;
    await prismaAdapter.linkAccount!(identityAccount);
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: tokenMinimizingAdapter,
  providers: [Google],
  session: { strategy: 'database' },
  pages: { signIn: '/login' },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
