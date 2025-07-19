import { getSDK } from "@/api/base";
import { AuthAPISDK } from "@loginradius-assignment/auth-sdk";
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
    id: string;
    email: string;
    username: string;
    full_name: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  getSDK: (token?: string) => AuthAPISDK; // Function to get the SDK instance
  isLoading: boolean;
  setToken: (token: string | null) => void; // Function to set the token
  fetchUser: () => Promise<void>; // Function to fetch user data
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('access_token');
    
    if (storedToken) {
      setToken(storedToken);
      
      // Try to fetch user data with stored token
      const authenticatedSDK = getSDK(storedToken);
      authenticatedSDK.authentication.getAuthMe()
        .then((userData) => {
          setUser(userData);
        })
        .catch((error) => {
          console.warn('Failed to restore user from stored token:', error);
          // Token might be expired or invalid, clear it
          localStorage.removeItem('access_token');
          setToken(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Update localStorage whenever the user state changes
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    // Handle token storage in localStorage and clear user when token is cleared
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
      setUser(null); // Clear user when token is cleared
    }
  }, [token]);

  const fetchUser = async () => {
    if (!token) return;
    
    try {
      const authenticatedSDK = getSDK(token);
      const userData = await authenticatedSDK.authentication.getAuthMe();
      setUser(userData);
    } catch (error) {
      console.warn('Failed to fetch user data:', error);
      // If user fetch fails, the token might be invalid
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, getSDK, isLoading, setToken, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};