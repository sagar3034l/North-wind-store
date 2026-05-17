import express from 'express';
import cors from 'cors'
import { clerkMiddleware } from '@clerk/express';
import { clerkWebhookHandler } from './webhooks/clerk.js';
import { getEnv } from './lib/env.js';

import productRouter from "./routes/productRouter.js"
import meRouter from "./routes/meRouter.js"
import fs from "node:fs"
import streamRouter from "./routes/streamRouter.js"

import "dotenv/config"
import path from 'node:path';

const app = express();

const env = getEnv()

const rawJson = express.raw({type:"application/json","limit":"1mb"})

app.post("/webhooks/clerk",rawJson,(req,res)=>{
     void clerkWebhookHandler(req,res)
})

app.use(express.json());

app.use(cors());

app.use(clerkMiddleware())


const publicDir = path.join(process.cwd(),"public")

app.use("/api/me",meRouter);
app.use("/api/products",productRouter);
app.use("/api/stream",streamRouter)

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



app.listen(env.PORT,()=>{
     console.log("Server is listening on",env.PORT)
})
