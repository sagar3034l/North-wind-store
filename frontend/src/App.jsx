import { useAuth } from '@clerk/react'
import PageLoader from './components/PageLoader';
import Layout from './components/Layout';
import { Navigate, Route, Routes } from 'react-router';
import Homepage from './pages/Homepage';
import CartPage from './pages/CartPage'
import CheckoutReturnPage from './pages/CheckoutReturn';
// import OrderDetailPage from './pages/OrderDetailPage';
import OrdersPage from './pages/OrdersPage';
import ProductDetail from './pages/ProductDetail'
import { SentryDemoPage } from './pages/SentryDemoPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrderChatPage from './pages/OrderChatPage';
import OrderSummaryPage from './pages/OrderSummaryPage';
import OrderVideoPage from './pages/OrderVideoPage';
import AdminProductsPage from './pages/AdminProductsPage';



function App() {
  const {isLoaded,isSignedIn} = useAuth();

  if(!isLoaded) return <PageLoader />
  return (
    <Layout>
      <Routes>
          <Route path='/' element={<Homepage />} />
          <Route path='/cart' element={<CartPage />}/>
          <Route path='/orders' element={<OrdersPage />}/>
          <Route path="/checkout/return" element={<CheckoutReturnPage />} />
          <Route path="/product/:slug" element={<ProductDetail />} />
          <Route path='/demo/sentry' element={<SentryDemoPage />}/>
          <Route path='/orders/:id' element={<OrderDetailPage />}>
          <Route path='/orders/:id/call' element={isSignedIn ? <OrderVideoPage /> : <Navigate to={"/"} replace/>}/>
              <Route index element={<OrderSummaryPage />}/>
              <Route path='chat' element={<OrderChatPage />}/>
          </Route>
          <Route path='/admin' element={isSignedIn ? <AdminProductsPage /> : <Navigate to={"/"} />} />
      </Routes>
    </Layout>
  ) 
}

export default App
