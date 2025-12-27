import React from 'react';
import { useApp } from '../context/AppContext';
import { motion } from 'framer-motion';
import { Moon, Sun, Bell, Shield, User, Settings as SettingsIcon, RefreshCw } from 'lucide-react';

const Settings = () => {
  const { darkMode, setDarkMode, currentUser, productAlertsEnabled, setProductAlertsEnabled } = useApp();

  const handleRefresh = () => {
    window.location.reload();
  };

  const settingSections = [
    {
      title: 'Appearance',
      items: [
        {
          icon: darkMode ? Sun : Moon,
          label: 'Dark Mode',
          description: 'Toggle between light and dark theme',
          action: (
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                darkMode ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          ),
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          icon: User,
          label: 'Profile',
          description: currentUser?.name || 'Admin User',
          value: currentUser?.role || 'Administrator',
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: Bell,
          label: 'Product Alerts',
          description: 'Get notified when stock is low',
          action: (
            <button
              onClick={() => setProductAlertsEnabled(!productAlertsEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                productAlertsEnabled ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  productAlertsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          ),
        },
      ],
    },
    {
      title: 'Security',
      items: [
        {
          icon: Shield,
          label: 'Two-Factor Authentication',
          description: 'Add an extra layer of security',
          value: 'Disabled',
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl px-5 py-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-600 rounded-2xl flex items-center justify-center">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              Settings
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Manage your account and preferences
            </p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center space-x-2"
        >
          <RefreshCw className="w-5 h-5" />
          <span>Refresh</span>
        </motion.button>
      </div>

      {/* Settings Sections */}
      {settingSections.map((section, sectionIndex) => (
        <motion.div
          key={section.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sectionIndex * 0.1 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {section.title}
          </h3>
          <div className="space-y-4">
            {section.items.map((item, itemIndex) => (
              <div
                key={itemIndex}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.label}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {item.description}
                    </p>
                  </div>
                </div>
                {item.action ? (
                  item.action
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {item.value}
                  </span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}

      
    </div>
  );
};

export default Settings;
