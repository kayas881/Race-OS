import React from 'react';
import { SignIn } from '@clerk/react';
import { DollarSign } from 'lucide-react';

const Login = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 mb-8">
        <div className="bg-primary-600 p-2 rounded-lg">
          <DollarSign className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-gray-900">Race-OS</span>
      </div>
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/register"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
};

export default Login;
