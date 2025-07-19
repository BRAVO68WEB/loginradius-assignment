# Dev Journey 🛡️

Building a brute-force protected authentication system turned out to be way more interesting than I initially thought. What started as a "simple" login form quickly evolved into a sophisticated security monitoring system with real-time anomaly detection.

## Breaking Down the Problem 🔎

Reading through the assignment, I knew this wasn't going to be your typical "store passwords in plain text" tutorial project. The requirements were pretty specific - track failed attempts per user AND per IP, with different thresholds and time windows. My brain immediately went to planning out the architecture.

<!-- Create a Index for the Markdown -->
-  [Dev Journey 🛡️](#dev-journey-️)
    - [Breaking Down the Problem 🔎](#breaking-down-the-problem-)
    - [Architecture Decisions 🏗️](#architecture-decisions-)
    - [Building the API 🔧](#building-the-api-)
    - [Database Design (The Fun Part) 🗄️](#database-design-the-fun-part-)
    - [The Security Layer 🔐](#the-security-layer-)
    - [The Heart of It: Anomaly Detection 📊](#the-heart-of-it-anomaly-detection-)
    - [Auto-Generated SDK (It makes life easier) 📦](#auto-generated-sdk-it-makes-life-easier-)
    - [Frontend: Making It Pretty 🖥️](#frontend-making-it-pretty-)
    - [Testing: The Boring But Important Stuff 🧪](#testing-the-boring-but-important-stuff-)
    - [The Technical Stuff That Actually Mattered ⚡](#the-technical-stuff-that-actually-mattered-)
    - [What Actually Works 🎯](#what-actually-works-)
    - [The Annoying Bugs I Had to Fix 💡](#the-annoying-bugs-i-had-to-fix-)
    - [Future Plans 🛠️](#future-plans-)
    - [Wrapping Up 🎉](#wrapping-up-)

The main challenge was implementing sophisticated brute-force protection while maintaining excellent user experience and system performance.

## Architecture Decisions 🏗️

I went with a monorepo setup because honestly, managing separate repos for a project this size would've been overkill. Turborepo made the most sense here:

- **`packages/api`**: The backend doing all the heavy lifting
- **`packages/sdk`**: Auto-generated client (because I'm lazy and hate writing API calls twice)
- **`apps/web`**: The React frontend that users actually see

**Why these tech choices?**
- **Bun**: Faster than Node.js and the package manager doesn't make me want to cry
- **Hono**: Lightweight, fast, and the middleware system just clicks with me
- **Kysely**: I'm an ORM skeptic - give me type-safe SQL any day
- **Docker**: For consistent deployments and easy local dev
- **PostgreSQL**: Because I like my data structured and performant
- **Redis**: For caching and rate limiting, because who doesn't love speed?
- **Nginx**: For reverse proxy

## Building the API 🔧

The Hono framework is my go-to choice for building APIs. Coming from Express, the middleware system felt familiar but cleaner and had built-in TypeScript support. I could define routes and middleware in a way that felt natural:

```typescript
const app = new Hono();

app.use('*', cors());
app.use('*', logger());
app.use('*', prettyJSON());
```

What really sold me was the OpenAPI integration. Instead of maintaining separate documentation, everything generates automatically. The `/docs` endpoint using Scalar looks professional without any extra work.

The trickiest part was designing the anomaly tracking. I needed to record failed attempts for both user-level and IP-level tracking simultaneously, but with different thresholds (5 vs 100 attempts). The progressive error messaging was also a fun challenge - showing "Invalid credentials" for the first few attempts, then switching to "Account Suspended!" once the threshold is hit.

## Database Design (The Fun Part) 🗄️

I kept the schema pretty simple but focused on performance. The `anomalies` table is where all the magic happens:

```sql
CREATE TABLE anomalies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anomaly_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Kysely over ORMs every time.** I get full TypeScript support, I can see exactly what SQL is being generated, and when I need raw SQL for complex queries, it's right there. No magic, no surprises.

## The Security Layer 🔐

Authentication wasn't just about "check password, return token." I needed to keep track of sessions and handle JWTs.

```typescript
static async loginUser(loginIdentity: string, password: string) {
  const userResult = await this.getUserByEmail(loginIdentity);
  
  if (!userResult.success || !userResult.data) {
    return { success: false, error: 'Invalid credentials' };
  }

  // Using sha256 + salt (yes, I know bcrypt exists, but this works fine)
  const isValidPassword = await crypto.createHmac('sha256', userResult.data.salt)
    .update(password)
    .digest('hex') === userResult.data.password_hash;

  if (!isValidPassword) {
    return { success: false, error: 'Invalid credentials' };
  }

    // Create a session token
    const session = await this.createSession(userResult.data.id);

  // JWT with 24h expiration seemed reasonable
  const token = jwt.sign(
    { 
        userId: userResult.data.id,
        claim_token: session.data.claim_token,
        exp: new Date().getTime() / 1000 + 24 * 60 * 60 // 24 hours
 },
    JWT_SECRET,
    'HS512'
  );

  return { success: true, token, user: userResult.data };
}
```

The role-based access control is straightforward - admins see everything, users see their profile. JWT stateless tokens made deployment simpler since I don't need to worry about session storage with cookies.

## The Heart of It: Anomaly Detection 📊

This is where things got interesting. I needed to track failed attempts at two levels simultaneously - per user (5 attempts) and per IP (100 attempts). The tricky part was the 15-minute sliding window and making sure the queries stayed fast:

```typescript
static async recordFailedLoginAttempt(c: Context, userId?: string) {
  const ipAddress = this.getClientIP(c);
  
  // Record a type of anomaly
  await db.insertInto('anomalies').values(
    {
      anomaly_type: 'user_login_ratelimited',
      user_id: userId || null,
      ip_address: ipAddress,
      created_at: new Date()
    },
  ).execute();

  // Check if we've hit the limits
  const userSuspended = userId ? await this.checkUserSuspension(userId) : false;
  const ipBlocked = await this.checkIpBlock(ipAddress);

  return { userSuspended, ipBlocked };
}
```

Secondly, I build a strategy to detect IP-level blocking. For every request, create a KEY in Redis with a TTL of 5 minutes. If the count exceeds 100, block the IP for 15 minutes, and log the anomaly to DB to permanently block it.

**Getting the real IP address** was trickier than expected. Had to handle X-Forwarded-For headers for proxy environments, plus fallbacks for different deployment scenarios.

The progressive messaging feature was fun to implement. Instead of immediately showing "account suspended," the first 5 attempts show "Invalid credentials," then it switches to "Account Suspended!" This makes it less obvious to attackers when they've hit the threshold.

## Auto-Generated SDK (It makes life easier) 📦

Writing API calls twice is for masochists. The OpenAPI spec automatically generates a fully typed SDK:

```typescript
export class AuthAPISDK {
  public readonly admin: AdminService;
  public readonly authentication: AuthenticationService;
  // ... all the good stuff with full TypeScript support
}
```

This means when I change an API endpoint, the frontend immediately knows about it. No more "wait, did this field get renamed?" debugging sessions at 2 AM.

[Check out the SDK here](../packages/sdk)
[Generate it with `bun run generate` in the `packages/sdk` directory]

## Frontend: Making It Pretty 🖥️

React + Vite + shadcn/ui is my go-to stack these days. Fast development, beautiful components, and TypeScript everywhere.

The authentication context was probably the trickiest part of the frontend. I needed to handle token persistence across page refreshes without creating infinite loading loops:

```typescript
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // This useEffect was the source of many bugs before I got it right
  useEffect(() => {
    const storedToken = localStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
      fetchUserData(storedToken);
    }
  }, []);
  
  // ... rest of the context magic
};
```

**UI** was a bit of a challenge, but I had the most fun. Real-time updates every 5 seconds, filtering, search, and those satisfying little pulsing indicators that show the data is live. The auto-refresh was tricky to implement without causing performance issues or memory leaks. I created the basic prototype quickly, but refining it using Lovable.dev and AI.

## Testing: The Boring But Important Stuff 🧪

I'll be honest - testing rate limiting logic is not the most exciting part of development. But it's crucial when you're dealing with security features:

```typescript
test('Should suspend user after 5 failed login attempts', async () => {
  const userData = genUser();
  await registerUser(userData);
  
  // Make 5 failed attempts
  for (let i = 0; i < 5; i++) {
    const res = await attemptLogin(userData.email, 'wrongpassword');
    expect(res.status).toBe(401);
  }
  
  // Now even the correct password should fail
  const res = await attemptLogin(userData.email, userData.password);
  expect(res.status).toBe(429);
  expect(res.body.error).toBe('User temporarily suspended due to too many failed login attempts');
});
```

The progressive messaging tests were particularly fun to write. Making sure the error messages change at exactly the right attempt count, testing IP blocking across multiple users, handling edge cases like concurrent requests.

**Pro tip**: Use different IP addresses in tests to avoid interference between test cases. That one took me longer to figure out than I'd like to admit.

[Check out the full test suite here](../packages/api/src/__test__/main.test.ts)

## The Technical Stuff That Actually Mattered ⚡

**Frontend auto-refresh** without memory leaks required proper cleanup:
```typescript
useEffect(() => {
  fetchData();
  
  intervalRef.current = setInterval(fetchData, 5000);
  
  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}, [token]);
```

**Rate limiting** had to build a proper strategy to handle both user and IP limits simultaneously. I used Redis for fast access and TTLs to manage the sliding window.

**IP detection** had to handle multiple scenarios - direct connections, proxies, load balancers. The fallback chain ended up being more complex than I initially planned.

## What Actually Works 🎯

✅ **The core stuff**: 5 failed attempts = user suspended for 15 minutes, 100 failed attempts from an IP for any given user in 5 minutes = blocked
✅ **Progressive messaging**: Different error messages based on attempt count (this was surprisingly satisfying to implement)
✅ **Admin dashboard**: Real-time monitoring with auto-refresh every 5 seconds

The anomaly detection system handles both attack vectors simultaneously, and the admin dashboard gives you a real-time view of what's happening. Data persists across restarts, so you can't just restart the server to bypass the limits.

## The Annoying Bugs I Had to Fix 💡

**Token persistence nightmare**: Tokens kept disappearing on page refresh. Turned out I had conflicting useEffect hooks fighting each other. The solution was separating token restoration from token changes.

**IP detection hell**: Getting the real client IP behind proxies was way harder than expected. Had to implement a fallback chain checking X-Forwarded-For, X-Real-IP, and finally the connection remote address.

## Future Plans 🛠️

- **Email notifications**: Alert users about suspicious login attempts
- **Machine learning**: Could detect more sophisticated attack patterns
- **Break into microservices**: This could improve scalability and maintainability. As the project grows, separating concerns into distinct services could make it easier to manage and scale. Like authentication, and logging could each be their own service. Use a message broker for inter-service communication.

## Wrapping Up 🎉

This was honestly more fun than I expected. Building security features that actually work in the real world is challenging but rewarding. The combination of user-level and IP-level protection creates multiple barriers for attackers, while the progressive messaging makes it less obvious when they've hit limits.

The admin dashboard turned out better than planned - watching the real-time anomaly detection in action is pretty satisfying. The auto-generated SDK saved tons of time on the frontend, and the comprehensive test suite gives me confidence the rate limiting actually works.

Thanks for the interesting assignment! Security-focused development definitely pushes you to think about edge cases and failure scenarios in ways that typical CRUD apps don't.
