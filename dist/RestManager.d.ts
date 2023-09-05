interface RestManagerOptions {
    clientID: string;
    clientSecret: string;
}
export declare class RestManager {
    private token;
    private authorization;
    stats: {
        requests: number;
        isRateLimited: boolean;
        nextRenew: number;
    };
    options: RestManagerOptions;
    constructor(options: RestManagerOptions);
    request<T>(endpoint: string): Promise<T>;
    getData<T>(url: string): Promise<T>;
    private handleRateLimited;
    private refreshToken;
    private renew;
}
export {};
