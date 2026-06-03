# OpenClaw SDK (TypeScript)
[![OpenClaw SDK](https://img.shields.io/badge/OpenClaw-SDK-orange?logo=github)](https://openclaw.ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?logo=typescript&color=yellow)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

> Feature-complete WebSocket SDK for TypeScript with automatic reconnection, event handling, and request/response correlation.

TypeScript SDK for connecting to OpenClaw Gateway via WebSocket, providing a fully-featured WebSocket client with connection management, event handling, request/response patterns, and automatic reconnection.

## Installation

```bash
npm install openclaw-sdk
```

## Quick Start

```typescript
import { createClient } from "openclaw-sdk";

const client = createClient({
  url: "wss://gateway.openclaw.example.com",
  credentials: {
    deviceId: "your-device-id",
    apiKey: "your-api-key",
  },
});

await client.connect();
console.log("Connected to OpenClaw Gateway");
```

## Features

- **WebSocket Transport**: Cross-platform support (Node.js and Browser)
- **Automatic Reconnection**: Configurable reconnection with Fibonacci backoff
- **Type-Safe**: Full TypeScript support with comprehensive type exports
- **Error Handling**: Rich error types with error codes and type guards
- **Event System**: Subscribe to gateway events with wildcard support
- **Request Cancellation**: AbortController support for long-running requests

## Configuration

The `ClientConfig` interface provides all configuration options:

```typescript
interface ClientConfig {
  // Required
  url: string;                    // WebSocket URL
  credentials: CredentialsProvider | DeviceCredentials;

  // Optional
  autoReconnect?: boolean;        // Auto-reconnect on disconnect (default: false)
  maxReconnectAttempts?: number;  // Max reconnection attempts (default: 5)
  reconnectDelayMs?: number;      // Initial reconnection delay (default: 1000)
  defaultRequestTimeout?: number; // Request timeout in ms (default: 30000)

  // TLS (Node.js only)
  tls?: TlsValidatorConfig;       // TLS validation options
}
```

## Authentication

The SDK supports multiple authentication methods through `CredentialsProvider`:

### Static Credentials

```typescript
import { createClient, StaticCredentialsProvider } from "openclaw-sdk";

const client = createClient({
  url: "wss://gateway.openclaw.example.com",
  credentials: {
    deviceId: "your-device-id",
    apiKey: "your-api-key",
  },
});
```

### Custom Credentials Provider

For dynamic token refresh or custom auth flows:

```typescript
import { type CredentialsProvider } from "openclaw-sdk";

const customProvider: CredentialsProvider = {
  async getCredentials() {
    return {
      token: await getAuthToken(),
      success: true,
    };
  },

  async shouldRefresh() {
    return tokenWillExpireSoon();
  },

  async refresh() {
    return {
      token: await refreshAuthToken(),
      success: true,
    };
  },
};

const client = createClient({
  url: "wss://gateway.openclaw.example.com",
  credentials: customProvider,
});
```

## Security Considerations

### In-Memory Credentials

When passing credentials directly via `ClientConfig.auth`, the credentials are stored in memory for the lifetime of the client instance. This applies to:

- `auth.token`
- `auth.bootstrapToken`
- `auth.deviceToken`
- `auth.password`

**For high-security environments**, use the `CredentialsProvider` pattern instead:

```typescript
const client = createClient({
  url: "wss://gateway.openclaw.example.com",
  credentials: new CustomCredentialsProvider(),
});
```

This allows you to:

- Retrieve credentials from secure storage (e.g., keychain, vault)
- Implement dynamic token refresh without storing static credentials
- Clear credentials from memory when not needed

See [Custom Credentials Provider](#custom-credentials-provider) for implementation details.

## Events

Subscribe to gateway events using the client's event system:

```typescript
// Subscribe to specific event
const unsubscribe = client.on("agent:status", (event) => {
  console.log("Agent status changed:", event.payload);
});

// Wildcard subscription
const unsubscribeAll = client.on("agent:*", (event) => {
  console.log("Agent event:", event.type, event.payload);
});

// Unsubscribe when done
unsubscribe();
unsubscribeAll();
```

## Platform Support

### Node.js

The SDK uses the `ws` library for WebSocket connections in Node.js:

```bash
npm install ws
```

### Browser

Native browser WebSocket API is used automatically—no additional dependencies needed.

## Reconnection Strategies

## Reconnection Strategies

The SDK provides two approaches to reconnection:

### Approach 1: Built-in Reconnection (Recommended)

**Use this when you need:**
- Simple automatic reconnection on disconnect
- Configurable max attempts and delay
- Standard Fibonacci backoff
- Integration with connection lifecycle

The `ConnectionManager` has built-in reconnection support:

```typescript
const client = createClient({
  url: "wss://gateway.openclaw.example.com",
  credentials: { ... },
  autoReconnect: true,      // Enable auto-reconnect
  maxReconnectAttempts: 5,  // Max retry attempts
  reconnectDelayMs: 1000,   // Initial delay
});

// Reconnection happens automatically
```

### Approach 2: Stand-alone ReconnectManager (Advanced)

**Use this when you need:**
- Custom reconnection logic separate from ConnectionManager
- Reconnection state tracking for external management
- Event-driven reconnection workflows
- Advanced retry strategies beyond standard backoff

```typescript
import { createReconnectManager } from "openclaw-sdk";

const reconnectMgr = createReconnectManager({
  maxAttempts: 10,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
});

reconnectMgr.on("stateChange", (state) => {
  if (state.phase === "waiting") {
    console.log(`Reconnecting in ${state.delayMs}ms...`);
  }
});

// Manual control
reconnectMgr.start();
// ... custom logic ...
reconnectMgr.stop();
```

### Decision Guide

| Need | Recommended Approach |
|------|---------------------|
| Standard reconnection on disconnect | ConnectionManager built-in |
| Custom reconnection logic | ReconnectManager stand-alone |
| Integration with connection lifecycle | ConnectionManager built-in |
| Event-driven reconnection workflows | ReconnectManager stand-alone |

## API Reference

### Main Client

```typescript
import {
  createClient,
  OpenClawClient,
  type ClientConfig,
} from "openclaw-sdk";
```

### Error Types

All error classes and types are exported for proper error handling:

```typescript
import {
  // Error classes
  OpenClawError,
  AuthError,
  ConnectionError,
  ProtocolError,
  RequestError,
  TimeoutError,
  CancelledError,
  AbortError,
  GatewayError,
  ReconnectError,

  // Error code types
  type AuthErrorCode,
  type ConnectionErrorCode,
  type ProtocolErrorCode,
  type RequestErrorCode,
  type GatewayErrorCode,
  type ReconnectErrorCode,

  // Error type guards
  isOpenClawError,
  isAuthError,
  isConnectionError,
  isTimeoutError,
  isCancelledError,
  isAbortError,

  // Error factory
  createErrorFromResponse,
} from "openclaw-sdk";
```

### Type Guards

Use type guards for safe error handling:

```typescript
try {
  await client.connect();
} catch (error) {
  if (isAuthError(error)) {
    console.error("Authentication failed:", error.errorCode);
  } else if (isConnectionError(error)) {
    console.error("Connection failed:", error.errorCode);
  } else {
    console.error("Unknown error:", error);
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run linter
npm run lint

# Build
npm run build

# Type check
npm run typecheck
```

## License

Apache 2.0
