import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { useAuth } from '@/contexts/AuthContext';

export const HomePage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { user } = useAuth();

  // Redirect authenticated users
  if (user) {
    return <Navigate to="/profile" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="relative overflow-hidden">
          <div 
            className={`transition-transform duration-500 ease-in-out ${
              isLogin ? 'transform translate-x-0' : 'transform -translate-x-full'
            }`}
          >
            {isLogin ? (
              <LoginForm onSwitch={() => setIsLogin(false)} />
            ) : (
              <div className="transform translate-x-full">
                <RegisterForm onSwitch={() => setIsLogin(true)} />
              </div>
            )}
          </div>
          
          {!isLogin && (
            <div 
              className={`absolute top-0 left-0 w-full transition-transform duration-500 ease-in-out ${
                !isLogin ? 'transform translate-x-0' : 'transform translate-x-full'
              }`}
            >
              <RegisterForm onSwitch={() => setIsLogin(true)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};