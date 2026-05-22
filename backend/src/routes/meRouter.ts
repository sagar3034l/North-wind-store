import { getAuth } from "@clerk/express";
import {Router} from "express"
import { getLocalUser } from "../db/user.js";

const router = Router();

router.get("/",async(req,res,next)=>{
    try {
        const {userId,isAuthenticated} = getAuth(req);
        console.log(userId,isAuthenticated)    
        if(!isAuthenticated || !userId){
            res.status(401).json({error:"Unauthorized"})
            return;
        }
        const user = await getLocalUser(userId);
        res.json({user})
    } catch (error) {
        next(error)
    }
})

export default router;