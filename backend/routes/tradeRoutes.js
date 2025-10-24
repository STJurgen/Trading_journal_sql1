import express from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/authMiddleware.js';
import { getTrades, createTrade, updateTrade, deleteTrade, importTrades } from '../controllers/tradeController.js';

const router = express.Router();
const upload = multer();

router.use(authenticate);

router.get('/', getTrades);
router.post('/', createTrade);
router.put('/:id', updateTrade);
router.delete('/:id', deleteTrade);
router.post('/import/csv', upload.single('file'), importTrades);

export default router;
