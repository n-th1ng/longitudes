import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { db } from './db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const user = await db.execute({
          sql: 'SELECT * FROM users WHERE email = ?',
          args: [credentials.email],
        });

        if (!user.rows.length) {
          throw new Error('No account found');
        }

        const dbUser = user.rows[0] as any;
        const valid = await bcrypt.compare(credentials.password, dbUser.password_hash);

        if (!valid) {
          throw new Error('Invalid password');
        }

        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          image: dbUser.avatar_url,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        // Check if user exists by email
        const existing = await db.execute({
          sql: 'SELECT id FROM users WHERE email = ?',
          args: [user.email!],
        });
        
        if (!existing.rows.length) {
          // Create new user
          const { nanoid } = await import('nanoid');
          const id = nanoid();
          await db.execute({
            sql: 'INSERT INTO users (id, email, name, avatar_url) VALUES (?, ?, ?, ?)',
            args: [id, user.email!, user.name || 'User', user.image || null],
          });
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET || 'longitudes-secret-key-change-in-production',
};