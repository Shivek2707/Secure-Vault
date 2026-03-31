const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Trigger Google Login
router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account' 
}));

// Google Callback
router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err || !user) {
            // This will help us see exactly what went wrong in the console
            console.error('Passport Auth Error:', err || 'No user found');
            return res.redirect('/?error=auth_failed');
        }

        // Generate the token
        const accessToken = jwt.sign(
    { id: user._id, role: user.role, status: user.status }, // Added status here
    process.env.JWT_ACCESS_SECRET, 
    { expiresIn: '1d' } // 15m might be too short for testing
);

        // Redirect back to frontend
        res.redirect(`/?token=${accessToken}`);
    })(req, res, next);
});

// Logout
router.get('/logout', (req, res) => {
    res.cookie('jwt', 'loggedout', {
        expires: new Date(Date.now() + 10 * 1000),
        httpOnly: true
    });
    res.status(200).json({ status: 'success' });
});

module.exports = router;