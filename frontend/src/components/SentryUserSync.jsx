import { useAuth } from "@clerk/react";
import * as Sentry from '@sentry/react'
import { useEffect } from "react";

export function SentryUserSync(){
    const {isLoaded,userId} = useAuth()
    useEffect(()=>{
    if(!isLoaded) return;
       Sentry.setUser(userId ? {id: userId} : null)
    },[isLoaded,userId])
    return null;
}