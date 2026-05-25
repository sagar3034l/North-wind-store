import "dotenv/config"
import express from 'express';
import type { NextFunction, Request, Response } from "express";
import cors from 'cors'
import { clerkMiddleware } from '@clerk/express';
import { clerkWebhookHandler } from './webhooks/clerk.js';
import { getEnv } from './lib/env.js';

import productRouter from "./routes/productRouter.js"
import meRouter from "./routes/meRouter.js"
import fs from "node:fs"
import streamRouter from "./routes/streamRouter.js"
import checkOutRouter from "./routes/checkOutRouter.js"
import orderRoutes from "./routes/orderRouter.js"
import path from 'node:path';
import * as Sentry from "@sentry/node";
import { polarWebhookHandler } from './webhooks/polar.js';
import { sentryClerkUserMiddleware } from './middleware/sentryClerkUser.js';
import adminRouter from "./routes/adminRouter.js"
import { ensureCheckoutSessionsTable } from "./db/bootstrap.js";

const app = express();

const env = getEnv()

const rawJson = express.raw({type:"application/json","limit":"1mb"})

app.post("/webhooks/clerk",rawJson,(req,res)=>{
     void clerkWebhookHandler(req,res)
})

app.post("/webhooks/polar",rawJson,(req,res)=>{
     console.log("Hello",rawJson)
     void polarWebhookHandler(req,res)
})


app.use(express.json());

app.use(cors({
     origin: "http://localhost:5173",
     credentials: true
}));

app.use(clerkMiddleware())

app.use(sentryClerkUserMiddleware)


const publicDir = path.join(process.cwd(),"public")

app.use("/api/me",meRouter);
app.use("/api/products",productRouter);
app.use("/api/stream",streamRouter)
app.use("/api/checkout",checkOutRouter)
app.use("/api/admin",adminRouter)
app.use("/api/orders",orderRoutes)

if(fs.existsSync(publicDir)){
     app.use(express.static(publicDir))

     app.get("/{*any}",(req,res,next)=>{
          if(req.method !== "GET" && req.method !== "HEAD"){
               next();
               return;
          }
          res.sendFile(path.join(publicDir,"index.html"),(err)=>next(err))
     })
}
// todo add error handler middlware

Sentry.setupExpressErrorHandler(app);

app.use((_err:unknown,_req:Request,res:Response,_next:NextFunction)=>{
     const sentryId = (res as express.Response & {sentry?:string}).sentry

     res.status(500).json({
          error: "Internal server error",
          ...(sentryId !== undefined && {sentryId})
     })
})

async function startServer() {
     try {
          await ensureCheckoutSessionsTable();
     } catch (error) {
          console.error("Database bootstrap failed:", error);
          process.exit(1);
     }

     app.listen(env.PORT,()=>{
          console.log("Server is listening on",env.PORT)
     })
}

void startServer();
