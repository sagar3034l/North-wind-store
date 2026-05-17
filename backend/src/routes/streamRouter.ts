import {Router} from 'express'
import { createStreamToken } from '../controller/streamController.js';

const router = Router();

router.post("/token",createStreamToken)

export default router