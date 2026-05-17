import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { users } from "./schema.js";

export async function getLocalUser(clerkUserId: string) {
     const [row] = await db.select().from(users).where(eq(users.clerkUserid,clerkUserId))
     return row   
}