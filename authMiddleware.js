// authMiddleware.js

const jwt = require('jsonwebtoken');

const authenticateUser = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'No token provided, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, 'your_jwt_secret'); // Replace with your secret
        req.user = decoded; // Attach the decoded user info to the request
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token, authorization denied' });
    }
};

module.exports = authenticateUser;
