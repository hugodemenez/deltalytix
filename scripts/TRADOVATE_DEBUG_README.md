# Tradovate Debug Script

A standalone TypeScript script for debugging Tradovate API integration, specifically designed to work with the demo environment.

## Overview

This script provides a comprehensive way to test Tradovate API endpoints and understand the data structure returned by various API calls. It supports both OAuth and password-based authentication, with automatic token persistence and refresh.

## Features

- **Demo-only environment**: All API calls target `https://demo.tradovateapi.com`
- **Dual authentication**: Supports both OAuth and password-based auth
- **Token persistence**: Saves tokens to `.tradovate-token.demo.json` for reuse
- **Automatic refresh**: Refreshes OAuth tokens when expired
- **Comprehensive API testing**: Tests multiple endpoints in sequence

## Setup

### Environment Variables

#### For OAuth Flow (Recommended)
```bash
TRADOVATE_CLIENT_ID=your_client_id
TRADOVATE_CLIENT_SECRET=your_client_secret
TRADOVATE_REDIRECT_URI=http://localhost:8787/tradovate/callback
```

#### For Password Flow (Legacy)
```bash
TRADOVATE_USERNAME=your_username
TRADOVATE_PASSWORD=your_password
TRADOVATE_CID=your_cid
TRADOVATE_SECRET=your_secret
```

### Installation

The script uses Bun as the package manager. No additional dependencies are required beyond what's already in the project.

## Usage

### Basic Usage (OAuth)
```bash
bun run tradovate:debug
```

### Password Flow
```bash
bun run tradovate:debug --method=password
```

## API Endpoints Tested

The script sequentially calls the following demo endpoints:

1. **Authentication**
   - `POST /v1/auth/accessTokenRequest` (password flow)
   - `POST /auth/oauthtoken` (OAuth token exchange/refresh)

2. **User Management**
   - `GET /v1/user/list` - List all users

3. **Account Management**
   - `GET /v1/account/deps?masterid=<userId>` - Get account dependencies
   - `GET /v1/account/suggest?t=<text>&l=3` - Suggest accounts
   - `GET /v1/account/find?name=XXXX` - Find specific account
   - `GET /v1/account/list` - List all accounts

4. **Trading Data**
   - `GET /v1/fillPair/list` - List fill pairs
   - `GET /v1/position/list` - List positions (trades)

## Sample Output

### Account List
```json
[
  {
    "id": 123455234,
    "name": "XXXX",
    "userId": 123455234,
    "accountType": "Customer",
    "restricted": false,
    "closed": false,
    "clearingHouseId": 4,
    "riskCategoryId": 70,
    "autoLiqProfileId": 19,
    "marginAccountType": "Speculator",
    "legalStatus": "Individual",
    "archived": false,
    "timestamp": "2024-07-11T06:56:09Z",
    "active": true
  }
]
```

### Positions (Trades)
```json
[
  {
    "id": 123455235,
    "accountId": 123455234,
    "contractId": 123455234,
    "timestamp": "2025-09-17T08:35:09.686Z",
    "tradeDate": {
      "year": 2025,
      "month": 9,
      "day": 17
    },
    "netPos": 0,
    "bought": 1,
    "boughtValue": 6662.5,
    "sold": 1,
    "soldValue": 6663,
    "archived": false,
    "prevPos": 0
  }
]
```

## Token Management

### Persistence
- Tokens are saved to `.tradovate-token.demo.json`
- Includes access token, refresh token, expiration time, method, and environment
- Automatically loaded on subsequent runs

### Refresh Logic
1. Check if persisted token exists and is not expired
2. If expired and OAuth method, attempt refresh using refresh token
3. If no valid token, acquire new token via OAuth or password flow
4. Save updated token for future use

### Error Handling
- Clears persisted token on authentication failure
- Provides clear error messages for debugging
- Continues execution even if individual endpoints fail

## OAuth Flow

1. **Authorization URL**: Opens browser to Tradovate OAuth page
2. **Local Server**: Starts temporary HTTP server to capture callback
3. **Code Exchange**: Exchanges authorization code for access token
4. **Token Storage**: Saves token with expiration for future use

## Password Flow

1. **Direct Authentication**: Uses username/password with client credentials
2. **Device ID**: Generates unique device identifier
3. **Captcha Handling**: Detects and reports captcha requirements
4. **Token Storage**: Saves access token with expiration

## File Structure

```
scripts/
├── tradovate-debug.ts          # Main debug script
└── TRADOVATE_DEBUG_README.md   # This documentation

.tradovate-token.demo.json      # Persisted token (auto-generated)
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Ensure token is valid and not expired
   - Check if using correct environment (demo vs live)
   - Verify OAuth credentials are correct

2. **Captcha Required**
   - Complete login in browser UI first
   - Use OAuth flow instead of password flow

3. **No Accounts Found**
   - Verify user has access to demo accounts
   - Check if account exists in demo environment

4. **Token Refresh Failed**
   - Clear `.tradovate-token.demo.json` and re-authenticate
   - Verify OAuth credentials are still valid

### Debug Information

The script provides detailed logging:
- Token acquisition/refresh status
- API endpoint URLs being called
- Response status codes and error messages
- Sample data from successful responses

## Integration Notes

### For Production Use
- Replace demo endpoints with live endpoints
- Implement proper error handling and retry logic
- Use database for token storage instead of JSON file
- Add rate limiting and request throttling

### Data Mapping
- Account ID: Use `account.id` for subsequent API calls
- User ID: Use `account.userId` for user-specific operations
- Position data: Contains trade information with buy/sell values
- Timestamps: All in ISO 8601 format

## Security Considerations

- Never commit `.tradovate-token.demo.json` to version control
- Use environment variables for sensitive credentials
- Implement proper token rotation in production
- Consider using PKCE for OAuth flows

## Future Enhancements

- Add support for live environment
- Implement fill/trade data fetching
- Add data export functionality
- Create configuration file for endpoint selection
- Add unit tests for individual functions
