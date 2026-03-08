const router = require('express').Router();
const { login, refresh } = require('../controllers/auth.controller');

router.post('/auth/login', login);
router.post('/auth/refresh', refresh);

module.exports = router;
