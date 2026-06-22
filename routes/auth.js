const express = require('express');
const router = express.Router();
const User = require('../models/User');
const passport = require('../config/passport');

// ================= LOGIN ROUTES =================

router.get('/login', (req, res) => {
    res.render('login', { error: null, preSelectUserType: null, loginEmail: null });
});

router.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        req.session.userId = req.user._id;
        req.session.userType = req.user.userType;
        req.session.userName = req.user.name;

        if (req.user.userType === 'customer') {
            res.redirect('/profile/customer');
        } else {
            res.redirect('/profile/labour');
        }
    }
);

// ================= NEAREST LABOURS API =================

router.get('/nearest-labours', async (req, res) => {
    try {
        const { latitude, longitude, profession } = req.query;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                message: 'Latitude and Longitude are required'
            });
        }

        const lat = Number(latitude);
        const lng = Number(longitude);

        if (isNaN(lat) || isNaN(lng)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coordinates'
            });
        }

        const query = { userType: 'labour' };

        if (profession && profession !== 'all') {
            query.profession = profession;
        }

        const labours = await User.aggregate([
            {
                $geoNear: {
                    near: { type: 'Point', coordinates: [lng, lat] },
                    distanceField: 'distance',
                    spherical: true,
                    query,
                    maxDistance: 50000
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    phone: 1,
                    profession: 1,
                    distance: 1,
                    location: 1
                }
            }
        ]);

        return res.status(200).json({
            success: true,
            count: labours.length,
            labours
        });

    } catch (error) {
        console.error('Geo Search Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;