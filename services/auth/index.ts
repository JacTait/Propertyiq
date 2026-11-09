/**
 * Authentication service contract.
 *
 * Intentionally provider-agnostic. A Clerk / Auth.js / Supabase Auth adapter
 * can implement `AuthProvider` without changes to the UI layer.
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  plan: "free" | "pro" | "enterprise";
}

export interface AuthSession {
  user: AuthUser;
  expiresAt: string;
}

export interface AuthProvider {
  readonly id: string;
  getSession(): Promise<AuthSession | null>;
  signIn(options?: { redirectTo?: string }): Promise<void>;
  signOut(): Promise<void>;
  onSessionChange(callback: (session: AuthSession | null) => void): () => void;
}

/** Local no-op provider used until a real auth integration is wired up. */
export class LocalAuthProvider implements AuthProvider {
  readonly id = "local";

  async getSession(): Promise<AuthSession | null> {
    return {
      user: {
        id: "local-investor",
        email: "investor@propertyiq.local",
        name: "Local Investor",
        avatarUrl: null,
        plan: "pro",
      },
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
    };
  }

  async signIn(): Promise<void> {
    /* Placeholder — no remote auth configured. */
  }

  async signOut(): Promise<void> {
    /* Placeholder — no remote auth configured. */
  }

  onSessionChange(): () => void {
    return () => undefined;
  }
}

export function getAuthProvider(): AuthProvider {
  return new LocalAuthProvider();
}
