import { fetch } from 'undici';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

interface RestManagerOptions {
  clientID: string;
  clientSecret: string
}

export class RestManager {


  private token: string = '';
  private authorization: string = '';
  public stats: { requests: number; isRateLimited: boolean, nextRenew: number } = { requests: 0, isRateLimited: false, nextRenew: 0 };
  public options: RestManagerOptions;

  constructor(options: RestManagerOptions) {

    this.options = options
    this.authorization = `Basic ${Buffer.from(`${options.clientID}:${options.clientSecret}`).toString('base64',)}`;
    this.refreshToken();

  }

  public async request<T>(endpoint: string): Promise<T> {
   await this.renew();

    const req = await fetch(`${SPOTIFY_API_URL}${endpoint}`,
      {
        headers: { Authorization: this.token },
      })
    const data = (await req.json()) as Promise<T>;

    if (req.headers.get('x-ratelimit-remaining') === '0') {
      this.handleRateLimited(Number(req.headers.get('x-ratelimit-reset')) * 1000);
      throw new Error('[Poru Spotify] currently we got rate limited by spotify!')
    }
    this.stats.requests++;

    return data;
  }


  public async getData<T>(url: string): Promise<T> {
   await  this.renew();
    const req = await fetch(url,
      {
        headers: { Authorization: this.token },
      })
    const data = (await req.json()) as Promise<T>;

    if (req.headers.get('x-ratelimit-remaining') === '0') {
      this.handleRateLimited(Number(req.headers.get('x-ratelimit-reset')) * 1000);
      throw new Error('[Poru Spotify] currently we got rate limited by spotify!')
    }
    this.stats.requests++;

    return data;
  }



  private handleRateLimited(time: number): void {
    this.stats.isRateLimited = true;
    setTimeout(() => {
      this.stats.isRateLimited = false;
    }, time);
  }

  private async refreshToken() {
    try {
      const req = await fetch(
        "https://accounts.spotify.com/api/token?grant_type=client_credentials",
        {
          method: "POST",
          headers: {
            Authorization: `${this.authorization}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const { access_token, expires_in } = (await req.json()) as {
        access_token?: string;
        expires_in: number;
      };
      if (!access_token) throw new Error("[Poru Spotify] failed to fetch access token from spotify api")
      this.token = `Bearer ${access_token}`;
      this.stats.nextRenew = new Date().getTime() + expires_in * 1000;
     } catch (e: any) {
      if (e.status === 400) {
        throw new Error("Spotify Plugin has been rate limited");
      }
    }

  }

  
  private async renew(): Promise<void> {
    if (Date.now() >= this.stats.nextRenew) {
      await this.refreshToken();
    }
  }
}