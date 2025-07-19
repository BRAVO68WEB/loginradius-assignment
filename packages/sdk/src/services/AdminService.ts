/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AdminService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * Get All Users
     * Retrieve all users from the system (Admin only)
     * @returns any Users retrieved successfully
     * @throws ApiError
     */
    public getAdminUsers(): CancelablePromise<{
        message: string;
        users: Array<{
            id: string;
            email: string;
            username: string;
            full_name: string | null;
            role: string;
            is_active: boolean;
            created_at: string;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/admin/users',
            errors: {
                401: `Authentication required`,
                403: `Admin access required`,
            },
        });
    }
    /**
     * Get All Anomalies
     * Retrieve all security anomalies (Admin only)
     * @returns any Anomalies retrieved successfully
     * @throws ApiError
     */
    public getAdminAnomalies(): CancelablePromise<{
        message: string;
        anomalies: Array<{
            id: string;
            anomaly_type: 'ip_ratelimited' | 'user_login_ratelimited';
            user_id: string | null;
            ip_address: string | null;
            created_at: string;
        }>;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/admin/anomalies',
            errors: {
                401: `Authentication required`,
                403: `Admin access required`,
            },
        });
    }
    /**
     * Get Anomaly Statistics
     * Get statistics about security anomalies (Admin only)
     * @returns any Anomaly stats retrieved successfully
     * @throws ApiError
     */
    public getAdminAnomalyStats(): CancelablePromise<{
        message: string;
        stats: {
            total_recent_attempts: number;
            unique_users_affected: number;
            unique_ips_involved: number;
            blocked_ips: number;
        };
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/admin/anomaly-stats',
            errors: {
                401: `Authentication required`,
                403: `Admin access required`,
            },
        });
    }
}
