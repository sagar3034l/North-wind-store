import { Router } from "express";
import { createCheckOut } from "../controller/checkoutController.js";

const router = Router()

router.post("/",createCheckOut)

export default router;
