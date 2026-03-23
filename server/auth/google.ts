import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { Express } from "express";

export interface GoogleUser {
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
}

export function setupGoogleAuth(app: Express) {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientID || !clientSecret) {
    console.warn("Google OAuth not configured: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL: `${process.env.APP_URL || ""}/api/auth/google/callback`,
        scope: ["profile", "email"],
      },
      (_accessToken, _refreshToken, profile, done) => {
        const googleUser: GoogleUser = {
          email: profile.emails?.[0]?.value || "",
          firstName: profile.name?.givenName || "",
          lastName: profile.name?.familyName || "",
          profileImageUrl: profile.photos?.[0]?.value || null,
        };
        done(null, googleUser);
      },
    ),
  );

  // Minimal serialize/deserialize — we don't use passport sessions
  passport.serializeUser((user, done) => done(null, user));
  passport.deserializeUser((user: any, done) => done(null, user));
}
