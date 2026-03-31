const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

// ADD THIS ROUTE: The frontend calls this on load
router.get('/profile', protect, (req, res) => {
    // req.user is populated by the 'protect' middleware
    res.json({
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
    });
});

// Your existing dashboard route
router.get('/dashboard/:id', protect, (req, res) => {
    const requestedId = req.params.id;
    const loggedInUserId = req.user.id;

    if (requestedId !== loggedInUserId) {
        logger.warn({
            event: 'BOLA_ATTEMPT',
            message: 'Unauthorized access attempt to dashboard',
            attackerId: loggedInUserId,
            targetId: requestedId,
            ip: req.ip
        });

        return res.status(403).json({
            status: 'fail',
            message: 'Security Alert: Access Denied.'
        });
    }

    res.json({
        status: 'success',
        data: 'Private dashboard data accessed.'
    });
});

module.exports = router;