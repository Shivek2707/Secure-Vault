const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.NODE_ENV === 'production' 
        ? "https://secure-vault-p44c.onrender.com/api/auth/google/callback" 
        : "http://localhost:8080/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value.toLowerCase();
        
        // 1. Find User in Cloud DB
        let user = await User.findOne({ email });

        // 2. ROOT_ADMIN Bypass
        if (email === 'shiveksingh43@.gmail.com') { // Double-check this matches your email exactly
            if (!user) {
                user = await User.create({
                    email,
                    name: profile.displayName,
                    role: 'admin',
                    status: 'approved',
                    googleId: profile.id,
                    avatar: profile.photos[0]?.value // Useful for the UI
                });
            }
            return done(null, user);
        }

        // 3. THE USER GATEKEEPER
        // If user doesn't exist, create them in QUARANTINE status first
        if (!user) {
            user = await User.create({
                email,
                name: profile.displayName,
                role: 'user',
                status: 'quarantine', // Default to blocked
                googleId: profile.id,
                avatar: profile.photos[0]?.value
            });
            console.log(`[SECURITY] New User Registered (Quarantined): ${email}`);
            return done(null, user); 
        }

        // 4. Return the user regardless of status 
        // (The Frontend/Middleware will handle the redirect if status === 'quarantine')
        return done(null, user);

      } catch (err) {
        console.error("Passport Strategy Error:", err);
        return done(err, null);
      }
    }
  )
);