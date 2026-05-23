import {Loader} from "lucide-react"
const PageLoader = () => {
  return (
    <div className='flex h-screen items-center justify-center'>
        <Loader className='size-20 animate-spin text-primary' />
    </div>
  )
}

export default PageLoader
