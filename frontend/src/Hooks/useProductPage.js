import { useParams} from 'react-router'
import {useQueries,useQuery} from '@tanstack/react-query'
import {apiFetch} from '../lib/api'

export function useProductsPage(){
   const {slug} = useParams()
   
   const {data, isLoading, error} = useQuery({
      queryKey:["products",slug],
      queryFn: ()=>apiFetch(`/api/products/${slug}`),
      enabled: Boolean(slug)
   })

   return {
    slug,
    isLoading,
    error,
    products: data?.product ?? null
   }
}