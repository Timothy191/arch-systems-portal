# Authentication Middleware

<cite>
**Referenced Files in This Document**
- [proxy.ts](file://apps/portal/proxy.ts)
- [middleware.ts](file://packages/supabase/src/middleware.ts)
- [server.ts](file://packages/supabase/src/server.ts)
- [page.tsx](file://apps/portal/app/(auth)/login/page.tsx)
- [LoginForm.tsx](file://apps/portal/app/(auth)/login/LoginForm.tsx)
- [001_initial.sql](file://packages/database/migrations/001_initial.sql)
- [supabase-auth.guard.ts](file://apps/api/src/auth/guards/supabase-auth.guard.ts)
- [security.controller.ts](file://apps/api/src/security/security.controller.ts)
</cite>

## Table of Contents

1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction

This document explains the authentication middleware implementation that protects Next.js routes using Supabase Auth. It covers how requests are intercepted, how sessions and JWT tokens are validated, how token expiration is handled, and how employee roles and department access permissions are resolved with caching. It also provides guidance for adding protected routes, implementing custom authorization logic, handling authentication errors, and security considerations such as CSRF protection, redirect validation, and secure cookie handling.

## Project Structure

The authentication flow spans several layers:

- Next.js middleware intercepts incoming requests and enforces authentication and authorization.
- Supabase SSR client manages cookies and session validation.
- Login page and form handle user sign-in and SSO flows.
- Database schema defines employees and departments used for role-based access control.
- API guard (NestJS) validates tokens for backend endpoints.
- CSP reporting endpoint captures policy violations.

```mermaid
graph TB
Client["Browser"] --> MW["Next.js Middleware<br/>proxy.ts"]
MW --> SBMW["Supabase SSR Client<br/>createMiddlewareClient()"]
MW --> DB["PostgreSQL (Supabase)<br/>employees, departments"]
MW --> Cache["Redis Cache<br/>employee + dept UUID"]
MW --> Resp["Response / Redirect"]
Client --> LoginPage["Login Page<br/>page.tsx"]
LoginPage --> LoginForm["Login Form<br/>LoginForm.tsx"]
LoginForm --> APIAuth["API Route /api/auth/login"]
APIAuth --> SBServer["Supabase Server Client<br/>getUserSafely()"]
Client --> APIGuard["NestJS Guard<br/>SupabaseAuthGuard"]
Client --> CSP["CSP Reports<br/>/csp-violations"]
```

**Diagram sources**

- [proxy.ts:263-375](file://apps/portal/proxy.ts#L263-L375)
- [middleware.ts:4-43](file://packages/supabase/src/middleware.ts#L4-L43)
- [server.ts:49-99](file://packages/supabase/src/server.ts#L49-L99)
- [page.tsx:15-31](<file://apps/portal/app/(auth)/login/page.tsx#L15-L31>)
- [LoginForm.tsx:74-145](<file://apps/portal/app/(auth)/login/LoginForm.tsx#L74-L145>)
- [supabase-auth.guard.ts:22-47](file://apps/api/src/auth/guards/supabase-auth.guard.ts#L22-L47)
- [security.controller.ts:25-44](file://apps/api/src/security/security.controller.ts#L25-L44)

**Section sources**

- [proxy.ts:1-56](file://apps/portal/proxy.ts#L1-L56)
- [middleware.ts:1-44](file://packages/supabase/src/middleware.ts#L1-L44)
- [server.ts:49-99](file://packages/supabase/src/server.ts#L49-L99)
- [page.tsx:15-31](<file://apps/portal/app/(auth)/login/page.tsx#L15-L31>)
- [LoginForm.tsx:74-145](<file://apps/portal/app/(auth)/login/LoginForm.tsx#L74-L145>)
- [supabase-auth.guard.ts:22-47](file://apps/api/src/auth/guards/supabase-auth.guard.ts#L22-L47)
- [security.controller.ts:25-44](file://apps/api/src/security/security.controller.ts#L25-L44)

## Core Components

- Request interception and routing decisions: The middleware decides whether to pass through, redirect to login, or enforce authorization based on path patterns and session state.
- Session validation: Uses Supabase SSR client to read and refresh cookies and validate the current user.
- Token expiration handling: Detects specific refresh token errors and triggers a clean sign-out and redirect.
- Employee resolution and caching: Resolves user roles and department access from the database and caches results to reduce latency.
- Department access checks: Validates top-level route segments against allowed departments and restricted routes by role.
- Secure cookie handling: Ensures HttpOnly, Secure, SameSite=Lax cookies are set appropriately.
- Redirect validation: Prevents open redirects by validating allowed paths.

**Section sources**

- [proxy.ts:6-45](file://apps/portal/proxy.ts#L6-L45)
- [proxy.ts:163-187](file://apps/portal/proxy.ts#L163-L187)
- [proxy.ts:204-221](file://apps/portal/proxy.ts#L204-L221)
- [proxy.ts:245-261](file://apps/portal/proxy.ts#L245-L261)
- [middleware.ts:11-33](file://packages/supabase/src/middleware.ts#L11-L33)
- [server.ts:88-99](file://packages/supabase/src/server.ts#L88-L99)

## Architecture Overview

The middleware orchestrates authentication and authorization across multiple services and caches.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant Middleware as "Next.js Middleware<br/>proxy.ts"
participant Supabase as "Supabase Auth<br/>createServerClient()"
participant DB as "PostgreSQL<br/>employees/departments"
participant Redis as "Redis Cache"
Browser->>Middleware : HTTP request
Middleware->>Middleware : Public path detection
alt Public path or static assets
Middleware-->>Browser : NextResponse.next()
else Login page
Middleware->>Supabase : getUser()
Supabase-->>Middleware : User or error
alt Expired token
Middleware->>Supabase : signOut()
Middleware-->>Browser : Redirect to root
else Authenticated
Middleware-->>Browser : Redirect to "/"
else Unauthenticated
Middleware-->>Browser : Pass through to login
end
else Protected route
Middleware->>Supabase : getUser()
Supabase-->>Middleware : User or error
alt Expired token
Middleware->>Supabase : signOut()
Middleware->>Redis : Evict employee cache
Middleware-->>Browser : Redirect to "/login?redirect=..."
else No user
Middleware-->>Browser : Redirect to "/login?redirect=..."
else User present
Middleware->>Redis : Get cached employee
alt Cache miss
Middleware->>DB : Fetch role + accessible_departments
DB-->>Middleware : Employee data
Middleware->>Redis : Set cache (TTL)
end
Middleware->>Middleware : Check restricted routes & department access
alt Unauthorized
Middleware-->>Browser : Redirect with error param
else Authorized
Middleware-->>Browser : NextResponse.next()
end
end
end
```

**Diagram sources**

- [proxy.ts:263-375](file://apps/portal/proxy.ts#L263-L375)
- [middleware.ts:4-43](file://packages/supabase/src/middleware.ts#L4-L43)
- [server.ts:88-99](file://packages/supabase/src/server.ts#L88-L99)

## Detailed Component Analysis

### Middleware Entry Point and Flow Control

- Public path detection: Static file extensions, manifest files, robots.txt, sitemap.xml, service worker, and workbox scripts are bypassed.
- Password reset/update pages are passed through without auth checks.
- Login page special handling: If an authenticated user tries to access /login, they are redirected to the home page; otherwise, the page is served.
- Protected routes: For non-public paths, the middleware validates the session and enforces authorization.

```mermaid
flowchart TD
Start(["Request Received"]) --> CheckPublic["Check public paths<br/>static assets, manifests, etc."]
CheckPublic --> |Public| PassThrough["NextResponse.next()"]
CheckPublic --> |Not Public| CheckPasswordReset["Check password reset/update paths"]
CheckPasswordReset --> |Allowed| PassThrough
CheckPasswordReset --> |Protected| CheckLogin["Is path /login?"]
CheckLogin --> |Yes| HandleLogin["Validate session<br/>Redirect if authenticated<br/>Pass through if not"]
CheckLogin --> |No| ValidateSession["Get user via Supabase"]
ValidateSession --> HasUser{"Has valid user?"}
HasUser --> |No| RedirectToLogin["Redirect to /login with redirect param"]
HasUser --> |Yes| ResolveEmployee["Resolve employee (cached)"]
ResolveEmployee --> CheckRestricted["Check restricted routes by role"]
CheckRestricted --> |Denied| RedirectError["Redirect with unauthorized_department"]
CheckRestricted --> |Allowed| CheckDept["Check department access"]
CheckDept --> |Unknown| RedirectError2["Redirect with unknown_department"]
CheckDept --> |Unauthorized| RedirectError
CheckDept --> |Authorized| Allow["NextResponse.next()"]
```

**Diagram sources**

- [proxy.ts:138-159](file://apps/portal/proxy.ts#L138-L159)
- [proxy.ts:263-375](file://apps/portal/proxy.ts#L263-L375)

**Section sources**

- [proxy.ts:138-159](file://apps/portal/proxy.ts#L138-L159)
- [proxy.ts:263-375](file://apps/portal/proxy.ts#L263-L375)

### Session Validation and JWT Expiration Handling

- Session retrieval: The middleware uses Supabase’s server client to get the current user from cookies.
- Token expiration detection: Errors containing “Invalid Refresh Token” or “Refresh Token Not Found” are treated as expired sessions.
- Sign-out behavior: On expiration, the middleware calls signOut(), clears relevant cache entries, and redirects to the login page.

```mermaid
sequenceDiagram
participant MW as "Middleware"
participant SB as "Supabase Auth"
MW->>SB : getUser()
SB-->>MW : { user, error }
alt Error indicates expired token
MW->>SB : signOut()
MW->>MW : Evict employee cache by prefix
MW-->>Browser : Redirect to "/login?redirect=..."
else Valid user
MW-->>Browser : Continue authorization
else No user
MW-->>Browser : Redirect to "/login?redirect=..."
end
```

**Diagram sources**

- [proxy.ts:163-187](file://apps/portal/proxy.ts#L163-L187)
- [proxy.ts:317-335](file://apps/portal/proxy.ts#L317-L335)

**Section sources**

- [proxy.ts:69-78](file://apps/portal/proxy.ts#L69-L78)
- [proxy.ts:163-187](file://apps/portal/proxy.ts#L163-L187)
- [proxy.ts:317-335](file://apps/portal/proxy.ts#L317-L335)

### Employee Resolution and Caching

- Employee data model: Role, primary department_id, and array of accessible_departments are fetched from the employees table linked to auth.users.
- Caching strategy: Results are cached under keys like arch:auth:employee:{userId} with a TTL to reduce database load.
- Department UUID resolution: Department slugs are mapped to UUIDs and cached under dept:uuid:{slug}.

```mermaid
classDiagram
class EmployeeAuth {
+string role
+string department_id
+string[] accessible_departments
}
class Cache {
+get(key) any
+set(key, value, ttl) void
+evictByPrefix(prefix) void
}
class Database {
+select("role, department_id, accessible_departments") from employees
+select("id") from departments
}
EmployeeAuth <.. Cache : "cached"
EmployeeAuth <.. Database : "fetched"
```

**Diagram sources**

- [proxy.ts:198-221](file://apps/portal/proxy.ts#L198-L221)
- [proxy.ts:119-136](file://apps/portal/proxy.ts#L119-L136)
- [001_initial.sql:27-35](file://packages/database/migrations/001_initial.sql#L27-L35)

**Section sources**

- [proxy.ts:198-221](file://apps/portal/proxy.ts#L198-L221)
- [proxy.ts:119-136](file://apps/portal/proxy.ts#L119-L136)
- [001_initial.sql:27-35](file://packages/database/migrations/001_initial.sql#L27-L35)

### Authorization Logic: Restricted Routes and Department Access

- Restricted routes: Certain top-level routes require specific roles (e.g., admin, supervisor). A secondary segment “tools” can be restricted independently.
- Department access: For department-scoped routes, the middleware checks if the user is admin, belongs to the department, or has explicit access via accessible_departments.
- Unknown department: If a department slug cannot be resolved, the request is redirected with an error parameter.

```mermaid
flowchart TD
A["Path parsed into segments"] --> B["Check RESTRICTED_ROUTES by role"]
B --> |Denied| E["Redirect unauthorized_department"]
B --> |Allowed| C["Top segment is department route?"]
C --> |No| D["Allow"]
C --> |Yes| F["Resolve dept UUID (cache first)"]
F --> |Not found| G["Redirect unknown_department"]
F --> |Found| H["Admin OR department_id matches OR accessible_departments includes"]
H --> |True| D
H --> |False| E
```

**Diagram sources**

- [proxy.ts:58-63](file://apps/portal/proxy.ts#L58-L63)
- [proxy.ts:223-243](file://apps/portal/proxy.ts#L223-L243)
- [proxy.ts:245-261](file://apps/portal/proxy.ts#L245-L261)

**Section sources**

- [proxy.ts:58-63](file://apps/portal/proxy.ts#L58-L63)
- [proxy.ts:223-243](file://apps/portal/proxy.ts#L223-L243)
- [proxy.ts:245-261](file://apps/portal/proxy.ts#L245-L261)

### Login Page Handling and Redirect Parameter Security

- Login page rendering: The server-side login page checks for existing auth cookies and attempts to validate the session safely. If the system is unavailable, it shows an error state.
- Redirect parameter validation: The login form validates the redirect target to prevent open redirects, ensuring only internal relative URLs pointing to application routes are accepted.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant LoginPage as "Login Page (Server)"
participant LoginForm as "Login Form (Client)"
participant API as "/api/auth/login"
participant Supabase as "Supabase Auth"
Browser->>LoginPage : GET /login
LoginPage->>Supabase : getUserSafely()
Supabase-->>LoginPage : User or null
LoginPage-->>Browser : Render login UI
Browser->>LoginForm : Submit credentials
LoginForm->>API : POST /api/auth/login
API->>Supabase : Authenticate
Supabase-->>API : Success with cookies
API-->>LoginForm : 200 OK
LoginForm->>LoginForm : Validate redirect param
LoginForm->>Browser : Navigate to safe redirect
```

**Diagram sources**

- [page.tsx:15-31](<file://apps/portal/app/(auth)/login/page.tsx#L15-L31>)
- [server.ts:88-99](file://packages/supabase/src/server.ts#L88-L99)
- [LoginForm.tsx:18-38](<file://apps/portal/app/(auth)/login/LoginForm.tsx#L18-L38>)
- [LoginForm.tsx:74-145](<file://apps/portal/app/(auth)/login/LoginForm.tsx#L74-L145>)

**Section sources**

- [page.tsx:15-31](<file://apps/portal/app/(auth)/login/page.tsx#L15-L31>)
- [server.ts:88-99](file://packages/supabase/src/server.ts#L88-L99)
- [LoginForm.tsx:18-38](<file://apps/portal/app/(auth)/login/LoginForm.tsx#L18-L38>)
- [LoginForm.tsx:74-145](<file://apps/portal/app/(auth)/login/LoginForm.tsx#L74-L145>)

### API Guard for Backend Endpoints (NestJS)

- Global guard: Validates Supabase session tokens via Authorization header or sb-access-token cookie.
- Public routes: Decorated with @Public() to skip authentication.
- Token extraction: Supports Bearer tokens and cookie-based tokens.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Guard as "SupabaseAuthGuard"
participant Supabase as "Supabase Client"
Client->>Guard : Request with Authorization or Cookie
Guard->>Guard : Check @Public() metadata
alt Public route
Guard-->>Client : Allow
else Protected route
Guard->>Supabase : getUser(token)
Supabase-->>Guard : User or error
alt Valid user
Guard-->>Client : Allow
else Invalid/missing token
Guard-->>Client : Deny
end
end
```

**Diagram sources**

- [supabase-auth.guard.ts:22-47](file://apps/api/src/auth/guards/supabase-auth.guard.ts#L22-L47)

**Section sources**

- [supabase-auth.guard.ts:22-47](file://apps/api/src/auth/guards/supabase-auth.guard.ts#L22-L47)

### CSP Reporting Endpoint

- Receives Content-Security-Policy violation reports and logs them without exposing sensitive details.

**Section sources**

- [security.controller.ts:25-44](file://apps/api/src/security/security.controller.ts#L25-L44)

## Dependency Analysis

- Middleware depends on:
  - Supabase SSR client for session management and cookie handling.
  - Redis cache for employee and department UUID lookups.
  - PostgreSQL via Supabase for employee and department data.
- Login page depends on:
  - Supabase server client for safe user retrieval.
  - Client-side form for credential submission and redirect validation.
- API guard depends on:
  - Supabase client for token validation.
  - NestJS decorators for public route exemptions.

```mermaid
graph LR
Proxy["proxy.ts"] --> SupabaseSSR["@repo/supabase/middleware.ts"]
Proxy --> Redis["@repo/redis/cache"]
Proxy --> Postgres["Supabase DB"]
LoginPage["login/page.tsx"] --> SupabaseServer["@repo/supabase/server.ts"]
LoginForm["login/LoginForm.tsx"] --> APIAuth["/api/auth/login"]
APIGuard["SupabaseAuthGuard"] --> SupabaseClient["Supabase Client"]
CSP["SecurityController"] --> Logger["Logging"]
```

**Diagram sources**

- [proxy.ts:1-4](file://apps/portal/proxy.ts#L1-L4)
- [middleware.ts:1-44](file://packages/supabase/src/middleware.ts#L1-L44)
- [server.ts:49-99](file://packages/supabase/src/server.ts#L49-L99)
- [supabase-auth.guard.ts:22-47](file://apps/api/src/auth/guards/supabase-auth.guard.ts#L22-L47)
- [security.controller.ts:25-44](file://apps/api/src/security/security.controller.ts#L25-L44)

**Section sources**

- [proxy.ts:1-4](file://apps/portal/proxy.ts#L1-L4)
- [middleware.ts:1-44](file://packages/supabase/src/middleware.ts#L1-L44)
- [server.ts:49-99](file://packages/supabase/src/server.ts#L49-L99)
- [supabase-auth.guard.ts:22-47](file://apps/api/src/auth/guards/supabase-auth.guard.ts#L22-L47)
- [security.controller.ts:25-44](file://apps/api/src/security/security.controller.ts#L25-L44)

## Performance Considerations

- Caching: Employee and department UUID lookups are cached with TTL to minimize database queries during authorization checks.
- Best-effort metrics: Observability calls are wrapped to avoid blocking the auth flow.
- Cookie propagation: When redirecting, cookies from the Supabase response are copied to ensure session continuity.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide

- Expired refresh token: If Supabase returns “Invalid Refresh Token” or “Refresh Token Not Found,” the middleware signs out and redirects to login. Ensure cookies are being set correctly and that the environment supports HTTPS in production.
- Unknown department: If a department slug cannot be resolved, the request is redirected with an error parameter. Verify department names and mappings.
- Unauthorized department: If the user lacks access to the requested department, they are redirected with an error parameter. Confirm employee.accessible_departments and department_id values.
- Open redirect prevention: Ensure redirect parameters are validated and only allow internal paths.

**Section sources**

- [proxy.ts:69-78](file://apps/portal/proxy.ts#L69-L78)
- [proxy.ts:245-261](file://apps/portal/proxy.ts#L245-L261)
- [proxy.ts:344-371](file://apps/portal/proxy.ts#L344-L371)
- [LoginForm.tsx:18-38](<file://apps/portal/app/(auth)/login/LoginForm.tsx#L18-L38>)

## Conclusion

The authentication middleware integrates Supabase Auth with role-based and department-scoped authorization, leveraging caching for performance and enforcing secure cookie policies. It handles token expiration gracefully, prevents open redirects, and provides clear error signaling for authorization failures. Extending protected routes and customizing authorization logic involves updating route restrictions and department access checks while maintaining secure cookie handling and robust error management.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Adding New Protected Routes

- Update the list of restricted routes and allowed roles in the middleware configuration.
- If a new top-level route requires department-specific access, add it to the department routes list and implement corresponding checks.

**Section sources**

- [proxy.ts:47-63](file://apps/portal/proxy.ts#L47-L63)
- [proxy.ts:223-243](file://apps/portal/proxy.ts#L223-L243)
- [proxy.ts:245-261](file://apps/portal/proxy.ts#L245-L261)

### Implementing Custom Authorization Logic

- Extend role checks for additional routes or nested segments.
- Integrate with external permission systems by modifying the employee resolution function and cache keys.

**Section sources**

- [proxy.ts:204-221](file://apps/portal/proxy.ts#L204-L221)
- [proxy.ts:223-243](file://apps/portal/proxy.ts#L223-L243)

### Handling Authentication Errors

- Use redirectWithError to propagate error parameters for client-side handling.
- Ensure observability metrics are best-effort and do not block the auth flow.

**Section sources**

- [proxy.ts:80-102](file://apps/portal/proxy.ts#L80-L102)
- [proxy.ts:300-314](file://apps/portal/proxy.ts#L300-L314)

### Security Considerations

- CSRF protection: Next.js server actions include built-in CSRF protection for same-origin requests; third-party API routes may need explicit CSRF tokens.
- Redirect validation: Enforce strict allowlists for redirect targets to prevent open redirects.
- Secure cookies: HttpOnly, Secure (in production), SameSite=Lax are enforced to mitigate XSS and CSRF risks.

**Section sources**

- [wiki/breakdown/security-posture.md:92-104](file://wiki/breakdown/security-posture.md#L92-L104)
- [proxy.ts:6-45](file://apps/portal/proxy.ts#L6-L45)
- [middleware.ts:25-31](file://packages/supabase/src/middleware.ts#L25-L31)
