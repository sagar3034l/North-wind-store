import type { NextFunction, Request, RequestHandler, Response } from "express";
import * as sentry from "@sentry/node"
import { getAuth } from "@clerk/express";

export const sentryClerkUserMiddleware: RequestHandler = (req:Request,res:Response,next:NextFunction)=>{
    const {userId} = getAuth(req);
    sentry.getIsolationScope().setUser(userId ? {id:userId} : null)
    next()
}