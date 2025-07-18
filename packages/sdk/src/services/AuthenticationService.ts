/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import type { BaseHttpRequest } from '../core/BaseHttpRequest';
export class AuthenticationService {
    constructor(public readonly httpRequest: BaseHttpRequest) {}
    /**
     * User Login
     * Authenticate user with brute-force protection
     * @param requestBody
     * @returns any Login successful
     * @throws ApiError
     */
    public postAuthLogin(
        requestBody?: {
            login_indentity: string;
            password: string;
        },
    ): CancelablePromise<{
        message: string;
        token: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/auth/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                401: `Invalid credentials`,
                403: `Account suspended or IP blocked`,
            },
        });
    }
    /**
     * User Registration
     * Register a new user account
     * @param requestBody
     * @returns any Registration successful
     * @throws ApiError
     */
    public postAuthRegister(
        requestBody?: {
            email: string;
            username: string;
            password: string;
        },
    ): CancelablePromise<{
        message: string;
        user: {
            id: string;
            email: string;
            username: string;
            created_at: string;
        };
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/auth/register',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Registration failed`,
            },
        });
    }
    /**
     * User Logout
     * Logout user session
     * @returns any Logout successful
     * @throws ApiError
     */
    public postAuthLogout(): CancelablePromise<{
        message: string;
    }> {
        return this.httpRequest.request({
            method: 'POST',
            url: '/auth/logout',
        });
    }
    /**
     * Get Current User
     * Retrieve the currently authenticated user
     * @returns any User retrieved successfully
     * @throws ApiError
     */
    public getAuthMe(): CancelablePromise<{
        id: string;
        email: string;
        username: string;
        full_name: string | null;
        role: string;
        is_active: boolean;
        created_at: string;
    }> {
        return this.httpRequest.request({
            method: 'GET',
            url: '/auth/me',
            errors: {
                401: `Authentication required`,
            },
        });
    }
}
