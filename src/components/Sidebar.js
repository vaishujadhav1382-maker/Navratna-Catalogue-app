import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, Settings, X, Moon, Sun, LogOut, Gift, ClipboardList, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { darkMode, setDarkMode, logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = (e) => {
    e.preventDefault();
    e.stopPropagation();
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Employees', path: '/employees', icon: Users },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Add Offers', path: '/add-offers', icon: Gift },
    { name: 'Catalogues', path: '/catalogues', icon: FileText },
    { name: 'Follow Up', path: '/follow-up', icon: ClipboardList },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -280 }}
        transition={{ type: 'spring', damping: 20 }}
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 lg:translate-x-0 lg:!transform-none`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-600 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-gray-900 dark:text-white">ProductHub</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Admin Panel</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && onClose()}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </NavLink>
            ))}
          </nav>

          {/* Footer with Theme Toggle and Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            {/* Action Buttons */}
            <div className="flex items-center space-x-2">
              {/* Dark mode toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setDarkMode(!darkMode)}
                className="flex-1 flex items-center justify-center space-x-2 p-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {darkMode ? 'Light' : 'Dark'}
                </span>
              </motion.button>

              {/* Logout button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center space-x-2 p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Logout</span>
              </motion.button>
            </div>
          </div>

        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
