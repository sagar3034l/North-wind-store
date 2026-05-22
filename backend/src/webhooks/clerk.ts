import type { Request, Response } from "express";
import { getEnv } from "../lib/env.js";
import {verifyWebhook} from '@clerk/backend/webhooks'
import { parseRole } from "../db/role.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function clerkWebhookHandler(req:Request,res:Response) {
    const env = getEnv()
    try {
        if(!env.CLERK_WEBHOOK_SECRET){
            res.status(503).send("Webhooks secret is not provided");
            return;
        }

        const payload = req.body instanceof Buffer ? req.body.toString("utf-8") : String(req.body)

        const request = new Request("http://internal/webhooks/clerk",{
            method: "POST",
            headers: new Headers(req.headers as HeadersInit),
            body: payload,
        })

        const evt = await verifyWebhook(request, {signingSecret: env.CLERK_WEBHOOK_SECRET});

        if(evt.type === "user.created" || evt.type === "user.updated"){
            const u = evt.data
            

            const email = u.email_addresses?.find((e)=> e.id === u.primary_email_address_id)?.email_address ?? u.email_addresses?.[0]?.email_address

            const displayName = [u.first_name,u.last_name].filter(Boolean).join(" ") || u.username || null;

            const role = parseRole(u.public_metadata?.role);
            await db.insert(users).values({
                clerkUserid: u.id,
                email,
                displayName,
                role
            }).onConflictDoUpdate({
                target:users.clerkUserid,
                set: {email,displayName,role,updatedAt: new Date()}
            })
        }
        else if(evt.type === "user.deleted"){
            const id = evt.data.id

            if(id){
                await db.delete(users).where(eq(users.clerkUserid,id))
            }
        }

        res.json({ok: true})
    } catch (error) {
        console.error("Error handling Clerk webhook:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
