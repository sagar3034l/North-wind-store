import type { Request, Response, NextFunction } from "express";
import {getEnv} from '../lib/env.js'
import z from "zod"
import { getAuth } from "@clerk/express";
import { getLocalUser } from "../db/user.js";
import { db } from "../db/index.js";
import { CheckoutSessionLine, checkoutSessions, products } from "../db/schema.js";
import { and, eq, inArray } from "drizzle-orm";
import { polarCreateCheckout } from "../lib/polar.js";

const env = getEnv();

const cartSchema = z.object({
    items: z.array(
        z.object({
            productId: z.string().uuid(),
            quantity: z.number().int().positive()
        })
    )
    .min(1),
})

export async function createCheckOut(req:Request,res:Response,next:NextFunction) {
   try {
      const {isAuthenticated,userId} = getAuth(req)
      if(!isAuthenticated || !userId){
         res.status(401).json({error:"Unauthorized"})
         return;
      }
      const parsed = cartSchema.safeParse(req.body)
      if(!parsed.success){
        res.status(400).json({error:"Invalid cart", details: parsed.error.flatten()})
        return;
      }

      if(!env.POLAR_ACCESS_TOKEN){
        res.status(503).json({error: "Payments are not configured"})
        return;
      }

      const localUser = await getLocalUser(userId);

      if(!localUser){
        res.status(503).json({error:"Account is not synced yet"})
        return;
      }

      const ids = parsed.data.items.map((i) => i.productId);

      const prodRows = await db
      .select()
      .from(products)
      .where(and(inArray(products.id,ids), eq(products.active,true)));

      if(prodRows.length !== ids.length){
        res.status(400).json({error:"One or more products are invalid"})
        return;
      }
    const byId = new Map(prodRows.map((p) => [p.id, p]));
    let totalCents = 0;
    const lines: CheckoutSessionLine[] = [];

    for (const line of parsed.data.items) {
      const p = byId.get(line.productId)!;
      totalCents += p.priceCents * line.quantity;
      lines.push({
        productId: p.id,
        quantity: line.quantity,
        unitPriceCents: p.priceCents,
      });
    }

      if (totalCents < 100) {
        res.status(400).json({
          error: "Total below minimum amount (minimum ₹1 required)",
        });
        return;
      }

      const [session] = await db.insert(checkoutSessions).values({
         userId: localUser.id,
         lines,
         totalCents,
         currency: "INR"
      })
      .returning();

      const successUrl = `${env.FRONTEND_URL}/checkout/return?checkout_id={CHECKOUT_ID}`
      const returnUrl = `${env.FRONTEND_URL}/cart`;
      
      const checkout = await polarCreateCheckout(env, {
        products: [env.POLAR_CHECKOUT_PRODUCT_ID],
        prices: {
          [env.POLAR_CHECKOUT_PRODUCT_ID]:[
            {
              amount_type: "fixed",
              price_currency: "INR",
              price_amount: totalCents
            }
          ]
        },
        success_url: successUrl,
        return_url: returnUrl,
        external_customer_id: userId,
        metadata: {checkout_session_id: session.id}
      })
      res.json({checkoutUrl:checkout.url})

      await db.update(checkoutSessions).set({polarCheckoutId: checkout.id}).where(eq(checkoutSessions.id,session.id))

   } catch (error) {
      console.error(error)
      res.status(401).json({error:"Internal server error"})
   }     
}

