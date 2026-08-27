import React from 'react';
import { Link } from 'react-router-dom';
import { SignUp } from '@clerk/react';
import { DollarSign } from 'lucide-react';

const Register = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 mb-8">
        <div className="bg-primary-600 p-2 rounded-lg">
          <DollarSign className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-bold text-gray-900">Race-OS</span>
      </div>
      <SignUp
        routing="path"
        path="/register"
        signInUrl="/login"
        fallbackRedirectUrl="/dashboard"
      />
      <p className="mt-6 text-xs text-gray-400">
        By signing up you agree to our{' '}
        <Link to="/terms" className="text-primary-600 hover:text-primary-700">Terms</Link>
        {' '}and{' '}
        <Link to="/privacy" className="text-primary-600 hover:text-primary-700">Privacy Policy</Link>.
      </p>
    </div>
  );
};

export default Register;
