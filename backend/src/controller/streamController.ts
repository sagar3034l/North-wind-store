import type { Request, Response, NextFunction } from "express";
import { getAuth, clerkClient, APIKey } from "@clerk/express";
import { getLocalUser } from "../lib/users.js";
import { getStreamChatServer, streamChatDisplayName, streamUserId } from "../lib/stream.js";
import { getEnv } from "../lib/env.js";

const env = getEnv();

export async function createStreamToken(req:Request,res:Response,next:NextFunction){
    try {
        const {isAuthenticated,userId} = getAuth(req)
        if(!userId || !isAuthenticated){
            res.status(401).json({error:"unauthorized"})
            return;
        }
        const localUser = await getLocalUser(userId)

        if(!localUser){
            res.status(503).json({error:"Account not synced yet"})
            return;
        }

        const server = getStreamChatServer(env)

        const clerkUser = await clerkClient.users.getUser(userId);
        const combinedName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() || null;

        const name = streamChatDisplayName(
            localUser.role,
            localUser.displayName ?? combinedName ?? clerkUser.username,
            localUser.email
        )

        const image = clerkUser.imageUrl || undefined;
        const sid = streamUserId(userId)

        await server.upsertUser({id:sid,name,image})

        const token = server.createToken(sid);
        res.json({token, apikey: env.STREAM_API_KEY,userid: sid})
    } catch (error) {
        next(error)
    }
}





