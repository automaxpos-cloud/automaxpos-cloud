const router = require('express').Router();
const auth = require('../middleware/auth');
const { syncSales, syncProducts } = require('../controllers/sync.controller');

router.post('/sync/sales', auth, syncSales);
router.post('/sync/products', auth, syncProducts);

module.exports = router;
