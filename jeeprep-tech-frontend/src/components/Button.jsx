import React from 'react';

const Button = ({ children, onClick, className = '', variant = 'primary', type = 'button', disabled = false }) => {
  const baseStyle = 'px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm sm:text-base';
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 focus:ring-gray-400',
    danger: 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-400',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 focus:ring-blue-500',
    ai: 'bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500',
    powerup: 'bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-400',
    outline: 'border border-blue-500 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 focus:ring-blue-500',
  };
  return (
    <button type={type} onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className}`} disabled={disabled}>
      {children}
    </button>
  );
};

export default Button;
