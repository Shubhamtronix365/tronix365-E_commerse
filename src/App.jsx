import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Shop from './pages/Shop';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Wishlist from './pages/Wishlist';
import OrderDetails from './pages/OrderDetails';
import Invoice from './pages/Invoice';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';
import { CartAnimationProvider } from './context/CartAnimationContext';
import { About, Contact, Terms, Privacy } from './pages/InfoPages';
import PaymentStatus from './pages/PaymentStatus';
import Categories from './pages/Categories';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PageTransition from './components/common/PageTransition';
import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

// Wrapper to scroll to top on route change
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return null;
};

// Placeholder pages to prevent crash
const Placeholder = ({ title }) => (
  <div className="min-h-screen pt-20 flex items-center justify-center text-white">
    <h1 className="text-3xl font-bold">{title} Page (Coming Soon)</h1>
  </div>
);

// Robust basename detection for subdirectory deployment
const getBasename = () => {
  // 1. Try Vite's build-time base URL
  let base = import.meta.env.BASE_URL || '/';

  // 2. Fallback: If we detect we're on the production domain in a known subdirectory
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/e-commerse')) {
    return '/e-commerse';
  }

  return base.replace(/\/$/, '');
};

const basename = getBasename();

function App() {
  return (
    <Router basename={basename}>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <CartAnimationProvider>
              <AppContent />
            </CartAnimationProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

const AppContent = () => {
  const location = useLocation();

  return (
    <>
      <ScrollToTop />
      <div className="min-h-screen bg-tronix-bg text-tronix-text font-sans selection:bg-tronix-primary selection:text-white flex flex-col">
        <Navbar />
        <main className="flex-grow overflow-hidden">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageTransition><Home /></PageTransition>} />
              <Route path="/shop" element={<PageTransition><Shop /></PageTransition>} />
              <Route path="/product/:id" element={<PageTransition><ProductDetails /></PageTransition>} />
              <Route path="/categories" element={<PageTransition><Categories /></PageTransition>} />
              <Route path="/category/:category" element={<PageTransition><Shop /></PageTransition>} />
              <Route path="/cart" element={<PageTransition><Cart /></PageTransition>} />
              <Route path="/checkout" element={
                <ProtectedRoute>
                  <PageTransition><Checkout /></PageTransition>
                </ProtectedRoute>
              } />
              <Route path="/wishlist" element={<PageTransition><Wishlist /></PageTransition>} />
              <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
              <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <PageTransition><UserDashboard /></PageTransition>
                </ProtectedRoute>
              } />
              <Route path="/order/:id" element={
                <ProtectedRoute>
                  <PageTransition><OrderDetails /></PageTransition>
                </ProtectedRoute>
              } />
              <Route path="/invoice/:id" element={
                <ProtectedRoute>
                  <PageTransition><Invoice /></PageTransition>
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute adminOnly={true}>
                  <PageTransition><AdminDashboard /></PageTransition>
                </ProtectedRoute>
              } />
              <Route path="/about" element={<PageTransition><About /></PageTransition>} />
              <Route path="/contact" element={<PageTransition><Contact /></PageTransition>} />
              <Route path="/payment/success" element={<PageTransition><PaymentStatus /></PageTransition>} />
              <Route path="/payment/failure" element={<PageTransition><PaymentStatus /></PageTransition>} />
              <Route path="/terms" element={<PageTransition><Terms /></PageTransition>} />
              <Route path="/privacy" element={<PageTransition><Privacy /></PageTransition>} />
              <Route path="*" element={<PageTransition><Home /></PageTransition>} />
            </Routes>
          </AnimatePresence>
        </main>
        <Footer />
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: '#1a1a2e',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }} />
      </div>
    </>
  );
};

export default App;
