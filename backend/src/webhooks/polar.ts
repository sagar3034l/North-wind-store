import { type NextFunction, type Request, type Response } from "express";
import { Webhook } from "standardwebhooks";
import { and, eq, or } from "drizzle-orm";

import { db } from "../db/index.js";
import { checkoutSessions, orderItems, orders } from "../db/schema.js";
import { getEnv } from "../lib/env.js";

function headerString(headers: Request["headers"], name: string) {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
}

async function alreadyPaid(polarOrderId?: string, checkoutId?: string) {
  const checks = [];

  if (polarOrderId) {
    checks.push(eq(orders.polarOrderid, polarOrderId));
  }

  if (checkoutId) {
    checks.push(eq(orders.polarCheckoutId, checkoutId));
  }

  if (checks.length === 0) {
    return false;
  }

  const [row] = await db
    .select()
    .from(orders)
    .where(checks.length === 1 ? checks[0] : or(...checks))
    .limit(1);

  return row?.status === "paid";
}

function getStringField(data: Record<string, unknown>, key: string) {
  const value = data[key];
  return typeof value === "string" ? value : undefined;
}

function isPaidOrderPayload(data: Record<string, unknown>) {
  return data.paid === true || data.status === "paid";
}

function checkoutSessionIdFromPayload(data: Record<string, unknown>) {
  const metadata = data.metadata;
  if (metadata && typeof metadata === "object") {
    const sessionId = (metadata as Record<string, unknown>).checkout_session_id;
    if (typeof sessionId === "string") {
      return sessionId;
    }
  }

  return undefined;
}

async function resolveCheckoutSession(data: Record<string, unknown>) {
  const checkoutId = getStringField(data, "checkout_id");
  const sessionIdFromMetadata = checkoutSessionIdFromPayload(data);

  if (sessionIdFromMetadata) {
    const [session] = await db
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, sessionIdFromMetadata))
      .limit(1);

    if (session) {
      return { session, checkoutId, sessionId: session.id };
    }
  }

  if (checkoutId) {
    const [session] = await db
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.polarCheckoutId, checkoutId))
      .limit(1);

    if (session) {
      return { session, checkoutId, sessionId: session.id };
    }
  }

  return { session: undefined, checkoutId, sessionId: sessionIdFromMetadata };
}

async function fulfillCheckoutSession(
  sessionId: string,
  polarOrderId: string | undefined,
  checkoutId: string | undefined,
) {
  return db.transaction(async (tx: any) => {
    const [session] = await tx
      .select()
      .from(checkoutSessions)
      .where(eq(checkoutSessions.id, sessionId))
      .for("update");

    if (!session) {
      return false;
    }

    const [order] = await tx
      .insert(orders)
      .values({
        userId: session.userId,
        status: "paid",
        totalCents: session.totalCents,
        polarCheckoutId: checkoutId ?? session.polarCheckoutId ?? null,
        polarOrderid: polarOrderId ?? null,
      })
      .returning();

    if (session.lines.length > 0) {
      await tx.insert(orderItems).values(
        session.lines.map((line: any) => ({
          orderId: order.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
        })),
      );
    }

    await tx.delete(checkoutSessions).where(eq(checkoutSessions.id, sessionId));

    return true;
  });
}

export async function polarWebhookHandler(req: Request, res: Response, _next?: NextFunction) {
  const env = getEnv();

  try {
    if (!env.POLAR_WEBHOOK_SECRET) {
      res.status(503).send("Polar webhooks not configured");
      return;
    }

    const rawData = req.body instanceof Buffer ? req.body : Buffer.from(String(req.body));
    const wh = new Webhook(env.POLAR_WEBHOOK_SECRET);

    const id = headerString(req.headers, "webhook-id");
    const ts = headerString(req.headers, "webhook-timestamp");
    const sig = headerString(req.headers, "webhook-signature");

    if (!id || !ts || !sig) {
      res.status(400).send("Missing webhook headers");
      return;
    }

    wh.verify(rawData, {
      "webhook-id": id,
      "webhook-timestamp": ts,
      "webhook-signature": sig,
    });

    const event = JSON.parse(rawData.toString("utf-8")) as {
      type?: string;
      data?: Record<string, unknown>;
    };

    if (!event.type || !event.data) {
      res.json({ ok: true });
      return;
    }

    const shouldFulfill =
      event.type === "order.paid" ||
      (event.type === "order.updated" && isPaidOrderPayload(event.data));

    if (!shouldFulfill) {
      res.json({ ok: true });
      return;
    }

    const data = event.data;
    const polarOrderId = getStringField(data, "id");
    const checkoutId = getStringField(data, "checkout_id");

    if (await alreadyPaid(polarOrderId, checkoutId)) {
      res.json({ ok: true, duplicate: true });
      return;
    }

    const { session, sessionId } = await resolveCheckoutSession(data);

    if (!session || !sessionId) {
      console.error("Polar paid webhook could not resolve checkout session", {
        polarOrderId,
        checkoutId,
      });
      res.status(404).json({ error: "Checkout session not found" });
      return;
    }

    const ok = await fulfillCheckoutSession(sessionId, polarOrderId, checkoutId);

    if (!ok) {
      console.error("Polar paid webhook could not fulfill checkout session", {
        sessionId,
        polarOrderId,
        checkoutId,
      });
      res.status(500).json({ error: "Checkout fulfillment failed" });
      return;
    }

    res.json({ ok: true });
  } catch (error) {
    console.error("Polar webhook failed:", error);
    res.status(400).json({ error: "Invalid webhook" });
  }
}
