import React from 'react';

const InputField = ({ label, id, type = 'text', value, onChange, placeholder, className = '', name, required = false, disabled = false }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <input
      type={type}
      id={id}
      name={name || id}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={`mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white ${className}`}
    />
  </div>
);

export default InputField;
