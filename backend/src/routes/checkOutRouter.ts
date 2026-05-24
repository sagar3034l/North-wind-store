import { Router } from "express";
import { createCheckout } from "../controller/checkoutController.js";

const router = Router()

router.post("/",createCheckout)

export default router;
