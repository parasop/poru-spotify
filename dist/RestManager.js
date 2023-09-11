"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestManager = void 0;
const undici_1 = require("undici");
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';
class RestManager {
    token = '';
    authorization = '';
    stats = { requests: 0, isRateLimited: false, nextRenew: 0 };
    options;
    constructor(options) {
        this.options = options;
        this.authorization = `Basic ${Buffer.from(`${options.clientID}:${options.clientSecret}`).toString('base64')}`;
        this.refreshToken();
    }
    async request(endpoint) {
        await this.renew();
        const req = await (0, undici_1.fetch)(`${SPOTIFY_API_URL}${endpoint}`, {
            headers: { Authorization: this.token },
        });
        const data = (await req.json());
        if (req.headers.get('x-ratelimit-remaining') === '0') {
            this.handleRateLimited(Number(req.headers.get('x-ratelimit-reset')) * 1000);
            throw new Error('[Poru Spotify] currently we got rate limited by spotify!');
        }
        this.stats.requests++;
        return data;
    }
    async getData(url) {
        await this.renew();
        const req = await (0, undici_1.fetch)(url, {
            headers: { Authorization: this.token },
        });
        const data = (await req.json());
        if (req.headers.get('x-ratelimit-remaining') === '0') {
            this.handleRateLimited(Number(req.headers.get('x-ratelimit-reset')) * 1000);
            throw new Error('[Poru Spotify] currently we got rate limited by spotify!');
        }
        this.stats.requests++;
        return data;
    }
    handleRateLimited(time) {
        this.stats.isRateLimited = true;
        setTimeout(() => {
            this.stats.isRateLimited = false;
        }, time);
    }
    async refreshToken() {
        try {
            const req = await (0, undici_1.fetch)("https://accounts.spotify.com/api/token?grant_type=client_credentials", {
                method: "POST",
                headers: {
                    Authorization: `${this.authorization}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
            });
            const { access_token, expires_in } = (await req.json());
            if (!access_token)
                throw new Error("[Poru Spotify] failed to fetch access token from spotify api");
            this.token = `Bearer ${access_token}`;
            this.stats.nextRenew = new Date().getTime() + expires_in * 1000;
        }
        catch (e) {
            if (e.status === 400) {
                throw new Error("Spotify Plugin has been rate limited");
            }
        }
    }
    async renew() {
        if (Date.now() >= this.stats.nextRenew) {
            await this.refreshToken();
        }
    }
}
exports.RestManager = RestManager;
//# sourceMappingURL=RestManager.js.map