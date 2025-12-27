import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Products from './pages/Products';
import ProductsEnhanced from './pages/ProductsEnhanced';
import Settings from './pages/Settings';
import AddOffers from './pages/AddOffers';
import FollowUp from './pages/FollowUp';
import Catalogs from './pages/Catalogs';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useApp();
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="employees" element={<Employees />} />
          <Route path="products" element={<ProductsEnhanced />} />
          <Route path="products-old" element={<Products />} />
          <Route path="add-offers" element={<AddOffers />} />
          <Route path="catalogs" element={<Catalogs />} />
          <Route path="catalogues" element={<Catalogs />} />
          <Route path="follow-up" element={<FollowUp />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}

export default App;
