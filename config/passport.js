const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.NODE_ENV === 'production' 
             ? "https://your-app-name.onrender.com/api/auth/google/callback" 
             : "http://localhost:8080/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value.toLowerCase();
        
        // 1. Search for the user by email (since you pre-add them by email)
        let user = await User.findOne({ email: email });

        // 2. HARDENED SHIELD: Reject if not pre-authorized
        if (!user || user.status !== 'approved') {
          console.log(`[AUTH REJECTED] Unauthorized login attempt: ${email}`);
          // Returning false tells Passport the authentication failed
          return done(null, false, { message: 'Neural ID not found in whitelist.' });
        }

        // 3. If pre-authorized, update their record with real Google data
        // This handles users who were added manually and are logging in for the first time
        user.googleId = profile.id;
        user.name = profile.displayName;
        user.avatar = profile.photos[0].value;
        
        // Ensure status remains approved
        user.status = 'approved'; 
        
        await user.save();
        
        console.log(`[AUTH SUCCESS] Operator synced: ${user.email}`);
        return done(null, user);

      } catch (err) {
        console.error("[PASSPORT ERROR]", err);
        return done(err, null);
      }
    }
  )
);