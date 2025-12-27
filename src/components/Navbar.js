import React from 'react';
import { Menu } from 'lucide-react';

const Navbar = ({ onMenuClick }) => {

  return (
    <header className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
      <div className="flex items-center px-4 h-10">
        {/* Mobile menu button only */}
        <button
          onClick={onMenuClick}
          className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;
