import React from 'react';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
const Home = React.lazy(() => import('./pages/Home'));
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const UserDashboard = React.lazy(() => import('./pages/UserDashboard'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));
const Shop = React.lazy(() => import('./pages/Shop'));
const ProductDetails = React.lazy(() => import('./pages/ProductDetails'));
const Cart = React.lazy(() => import('./pages/Cart'));
const Checkout = React.lazy(() => import('./pages/Checkout'));
const Wishlist = React.lazy(() => import('./pages/Wishlist'));
const OrderDetails = React.lazy(() => import('./pages/OrderDetails'));
const Categories = React.lazy(() => import('./pages/Categories'));
const PaymentStatus = React.lazy(() => import('./pages/PaymentStatus'));

// Lazy load InfoPages
const About = React.lazy(() => import('./pages/InfoPages').then(module => ({ default: module.About })));
const Contact = React.lazy(() => import('./pages/InfoPages').then(module => ({ default: module.Contact })));
const Terms = React.lazy(() => import('./pages/InfoPages').then(module => ({ default: module.Terms })));
const Privacy = React.lazy(() => import('./pages/InfoPages').then(module => ({ default: module.Privacy })));
const ReturnRefund = React.lazy(() => import('./pages/InfoPages').then(module => ({ default: module.ReturnRefund })));

import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthProvider } from './context/AuthContext';
import { CartAnimationProvider } from './context/CartAnimationContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PageTransition from './components/common/PageTransition';
import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { MaintenanceModal } from './components/common/MaintenanceNotice';
// import { Agentation } from 'agentation';

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

// Sleek loading fallback for lazy routes
const PageLoader = () => (
  <div className="min-h-screen bg-tronix-bg flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-tronix-primary"></div>
  </div>
);

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
  // Maintenance Modal disabled by default - can be re-enabled on request
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  useEffect(() => {
    if (!showMaintenanceModal) {
      // Periodic maintenance modal trigger disabled
      return;
    }
  }, [showMaintenanceModal]);

  const isExcludedPage = location.pathname === '/login' || location.pathname === '/signup';

  return (
    <>
      <ScrollToTop />
      {/* Maintenance Notice Modal disabled: uncomment below to enable when needed
      <MaintenanceModal 
        isOpen={showMaintenanceModal} 
        onClose={() => setShowMaintenanceModal(false)} 
      />
      */}
      <div className="min-h-screen bg-tronix-bg text-tronix-text font-sans selection:bg-tronix-primary selection:text-white flex flex-col">
        {!isExcludedPage && <Navbar />}
        <main className="flex-grow overflow-hidden">
          <React.Suspense fallback={<PageLoader />}>
            <AnimatePresence mode="wait">
              <Routes location={location} key={location.pathname}>
              <Route path="/" element={<PageTransition><Home /></PageTransition>} />
              <Route path="/shop" element={<PageTransition><Shop /></PageTransition>} />
              <Route path="/product/:slug" element={<PageTransition><ProductDetails /></PageTransition>} />
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
              <Route path="/return-refund" element={<PageTransition><ReturnRefund /></PageTransition>} />
              <Route path="*" element={<PageTransition><Home /></PageTransition>} />
              </Routes>
            </AnimatePresence>
          </React.Suspense>
        </main>
        {!isExcludedPage && <Footer />}
        <Toaster position="bottom-right" toastOptions={{
          style: {
            background: '#1a1a2e',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }} />
        {/* <Agentation /> */}
      </div>
    </>
  );
};

export default App;
