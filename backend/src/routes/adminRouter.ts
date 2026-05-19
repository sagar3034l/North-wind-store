import { Router } from "express";
import { createAdminProduct, getImagekitAuth, listAdminProducts, requireAdmin, updateAdminProduct } from "../controller/adminController.js";
const router = Router();

router.use(requireAdmin)

router.get("/imagekit/auth",getImagekitAuth);
router.get("/products",listAdminProducts);
router.post("/products",createAdminProduct);
router.patch("/product/:id",updateAdminProduct)

export default router;