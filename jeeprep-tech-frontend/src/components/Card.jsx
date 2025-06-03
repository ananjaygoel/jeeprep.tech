import React from 'react';

const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 shadow-lg rounded-xl p-4 sm:p-6 ${className}`}>
    {children}
  </div>
);

export default Card;
