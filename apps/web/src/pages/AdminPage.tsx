import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Navigation } from '@/components/Navigation';
import { useAdminUsers, useAdminAnomalies, useAnomalyStats } from '@/hooks/useApi';
import { 
  Users, 
  Shield, 
  AlertTriangle, 
  Search, 
  TrendingUp,
  Calendar,
  Network,
  UserX
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { users, loading: usersLoading } = useAdminUsers();
  const { anomalies, loading: anomaliesLoading } = useAdminAnomalies();
  const { stats, loading: statsLoading } = useAnomalyStats();

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [anomalyTypeFilter, setAnomalyTypeFilter] = useState<string>('all');
  const [anomalyUserFilter, setAnomalyUserFilter] = useState('');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                         user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                         (user.full_name?.toLowerCase() || '').includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredAnomalies = anomalies.filter(anomaly => {
    const matchesType = anomalyTypeFilter === 'all' || anomaly.anomaly_type === anomalyTypeFilter;
    const matchesUser = !anomalyUserFilter || 
                       (anomaly.user_id && anomaly.user_id.includes(anomalyUserFilter)) ||
                       (anomaly.ip_address && anomaly.ip_address.includes(anomalyUserFilter));
    return matchesType && matchesUser;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAnomalyBadgeVariant = (type: string) => {
    switch (type) {
      case 'ip_ratelimited':
        return 'destructive';
      case 'user_login_ratelimited':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <Navigation />
      
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Monitor users and security anomalies</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">Auto-refreshing every 5 seconds</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Card className="shadow-medium bg-gradient-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {usersLoading ? '...' : users.length}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium bg-gradient-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Recent Attempts (15 mins)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {statsLoading ? '...' : stats?.total_recent_attempts || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium bg-gradient-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <UserX className="h-4 w-4" />
                Affected Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {statsLoading ? '...' : stats?.unique_users_affected || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium bg-gradient-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Network className="h-4 w-4" />
                Unique IPs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {statsLoading ? '...' : stats?.unique_ips_involved || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-medium bg-gradient-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Network className="h-4 w-4" />
                Blacklisted IPs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {statsLoading ? '...' : stats?.blocked_ips || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Section */}
        <Card className="shadow-medium bg-gradient-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              User Management
            </CardTitle>
            <CardDescription>Manage and monitor user accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">No users found</TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-medium">{user.id}</div>
                          </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'outline' : 'destructive'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Anomalies Section */}
        <Card className="shadow-medium bg-gradient-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-destructive" />
              Security Anomalies
            </CardTitle>
            <CardDescription>Monitor and analyze security threats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user ID or IP..."
                  value={anomalyUserFilter}
                  onChange={(e) => setAnomalyUserFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={anomalyTypeFilter} onValueChange={setAnomalyTypeFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ip_ratelimited">IP Rate Limited</SelectItem>
                  <SelectItem value="user_login_ratelimited">User Rate Limited</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomaliesLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : filteredAnomalies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">No anomalies found</TableCell>
                    </TableRow>
                  ) : (
                    filteredAnomalies.map((anomaly) => (
                      <TableRow key={anomaly.id}>
                        <TableCell>
                          <Badge variant={getAnomalyBadgeVariant(anomaly.anomaly_type)}>
                            {anomaly.anomaly_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {anomaly.user_id || 'N/A'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {anomaly.ip_address || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(anomaly.created_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};