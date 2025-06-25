import React from 'react';

export default function Topbar({ title, admin }) {
  return (
    <div className="flex items-center justify-between bg-white shadow px-6 py-4 mb-6">
      <h1 className="text-xl font-bold text-indigo-700">{title}</h1>
      <div className="text-gray-600 text-sm">Logged in as Admin: <span className="font-semibold">{admin?.name}</span></div>
    </div>
  );
} 