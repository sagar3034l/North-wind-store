import {z} from 'zod'

const nodeEnvSchema = z.enum(["development","production","test"])

const envSchema = z.object({
    NODE_ENV : z.preprocess((value) => {
        if (typeof value !== "string") return value

        const normalized = value.trim().toLowerCase()
        return normalized === "developement" ? "development" : normalized
    }, nodeEnvSchema).default("development"),
    PORT: z.string().default("3000"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    
    CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    CLERK_WEBHOOK_SECRET: z.string().optional(),
    FRONTEND_URL: z.string().url(),

    POLAR_ACCESS_TOKEN: z.string().optional(),
    POLAR_WEBHOOK_SECRET: z.string().optional(),
    POLAR_API_BASE: z.string().url().default("http://api.polar.sh"),
    POLAR_CHECKOUT_PRODUCT_ID: z.string().uuid(),

    STREAM_API_KEY: z.string().min(1),
    STREAM_API_SECRET: z.string().min(1),
    IMAGEKIT_PUBLIC_KEY: z.string().min(1),
    IMAGEKIT_PRIVATE_KEY : z.string().min(1),
    IMAGEKIT_URL_ENDPOINT: z.string().url(),
    SENTRY_DSN: z.string().url().optional()
})

export type Env = z.infer<typeof envSchema>


export function loadENV() {
    const parsed = envSchema.safeParse(process.env)

    if(!parsed.success){
        console.error(parsed.error.flatten().fieldErrors)
        throw new Error("Invalid environment variables")
    }
     
    return parsed.data
}

let cachedEnv: Env | null = null

export function getEnv(){
    if(!cachedEnv){
        cachedEnv = loadENV();
    } 
    return cachedEnv
}
