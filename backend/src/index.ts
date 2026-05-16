import express from 'express';
import cors from 'cors'
import { clerkMiddleware } from '@clerk/express';
import { clerkWebhookHandler } from './webhooks/clerk';
import { getEnv } from './lib/env';
import "dotenv/config"

const app = express();

const env = getEnv()

const rawJson = express.raw({type:"application/json","limit":"1mb"})

app.post("/webhooks/clerk",rawJson,(req,res)=>{
     void clerkWebhookHandler(req,res)
})

app.use(express.json());

app.use(cors());

app.use(clerkMiddleware())



app.listen(env.PORT,()=>{
     console.log("Server is listening on",env.PORT)
})
