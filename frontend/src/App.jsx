import { useAuth } from '@clerk/react'
import PageLoader from './components/PageLoader';
import Layout from './components/Layout';
import { Route, Routes } from 'react-router';
import Homepage from './pages/Homepage';
import CartPage from './pages/CartPage'
import CheckoutReturnPage from './pages/CheckoutReturn';
import OrderDetailPage from './pages/OrderDetailPage';



function App() {
  const {isLoaded} = useAuth();

  if(!isLoaded) return <PageLoader />
  return (
    <Layout>
      <Routes>
          <Route path='/' element={<Homepage />} />
          <Route path='/cart' element={<CartPage />}/>
          <Route path='/orders' element={<OrderDetailPage />}/>
          <Route path="/checkout/return" element={<CheckoutReturnPage />} />
      </Routes>
    </Layout>
  )
}

export default App
