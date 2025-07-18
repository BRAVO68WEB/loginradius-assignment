import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Anomaly {
  id: string;
  anomaly_type: 'ip_ratelimited' | 'user_login_ratelimited';
  user_id: string | null;
  ip_address: string | null;
  created_at: string;
}

interface AnomalyStats {
  total_recent_attempts: number;
  unique_users_affected: number;
  unique_ips_involved: number;
  time_window_minutes: number;
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getSDK, token } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUsers = async () => {
    if (!token) return;
    
    try {
      const sdk = getSDK(token);
      const response = await sdk.admin.getAdminUsers();
      setUsers(response.users);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Set up auto-refresh every 5 seconds
    intervalRef.current = setInterval(() => {
      fetchUsers();
    }, 5000);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token]);

  const refetch = () => {
    setLoading(true);
    fetchUsers();
  };

  return { users, loading, error, refetch };
};

export const useAdminAnomalies = () => {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getSDK, token } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAnomalies = async () => {
    if (!token) return;
    
    try {
      const sdk = getSDK(token);
      const response = await sdk.admin.getAdminAnomalies();
      setAnomalies(response.anomalies);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch anomalies:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnomalies();

    // Set up auto-refresh every 5 seconds
    intervalRef.current = setInterval(() => {
      fetchAnomalies();
    }, 5000);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token]);

  const refetch = () => {
    setLoading(true);
    fetchAnomalies();
  };

  return { anomalies, loading, error, refetch };
};

export const useAnomalyStats = () => {
  const [stats, setStats] = useState<AnomalyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getSDK, token } = useAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = async () => {
    if (!token) return;
    
    try {
      const sdk = getSDK(token);
      const response = await sdk.admin.getAdminAnomalyStats();
      setStats(response.stats);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch anomaly stats:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // Set up auto-refresh every 5 seconds
    intervalRef.current = setInterval(() => {
      fetchStats();
    }, 5000);

    // Cleanup interval on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [token]);

  const refetch = () => {
    setLoading(true);
    fetchStats();
  };

  return { stats, loading, error, refetch };
};