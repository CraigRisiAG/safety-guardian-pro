# Notification Integrations API Guide

This guide describes a practical API design for production-grade notification integrations used by Safety Guardian Pro.

## Backend-ready contract file

- [OpenAPI contract (YAML)](./NOTIFICATION_INTEGRATIONS_OPENAPI_CONTRACT.yaml)
- [OpenAPI contract (JSON)](./NOTIFICATION_INTEGRATIONS_OPENAPI_CONTRACT.json)

## Goals

- Keep provider secrets out of browser storage in production.
- Use a backend service to send Email, SMS, Teams, WhatsApp, and Slack notifications.
- Preserve existing in-app notifications as a fallback and audit trail.

## Recommended Architecture

1. Frontend (Admin portal): captures provider settings and sends to backend API.
2. Backend API: validates settings, stores secrets securely, and exposes test/send endpoints.
3. Worker/queue: handles outbound delivery and retries.
4. Provider connectors: SMTP/Twilio/Vonage/Teams webhook/WhatsApp API/Slack webhook.
5. Audit store: records sent, queued, failed states.

## Security Recommendations

- Use secret storage (for example Azure Key Vault, AWS Secrets Manager, or environment secret manager).
- Never return full secrets in API responses.
- Mask secrets in logs and UI responses.
- Use role-based authorization: admin-only for settings and test endpoints.

## API Endpoints (Suggested)

## 1. Save Provider Configuration

POST /api/integrations/notifications/config

Request body example:

{
  "email": {
    "enabled": true,
    "host": "smtp.company.com",
    "port": 587,
    "secure": false,
    "username": "smtp-user",
    "password": "***",
    "fromAddress": "alerts@company.com",
    "fromName": "Safety Guardian Alerts"
  },
  "sms": {
    "enabled": true,
    "provider": "twilio",
    "apiBaseUrl": "https://api.twilio.com",
    "accountId": "ACxxxxxxxx",
    "authToken": "***",
    "fromNumber": "+15551234567"
  },
  "teams": {
    "enabled": true,
    "webhookUrl": "https://outlook.office.com/webhook/..."
  },
  "whatsapp": {
    "enabled": false,
    "apiBaseUrl": "https://graph.facebook.com",
    "accessToken": "***",
    "phoneNumberId": "123456"
  },
  "slack": {
    "enabled": true,
    "webhookUrl": "https://hooks.slack.com/services/...",
    "botToken": "***",
    "channel": "#safety-alerts"
  }
}

Response example:

{
  "ok": true,
  "message": "Notification integration settings saved",
  "masked": {
    "email": { "username": "smtp-user", "password": "***" },
    "sms": { "accountId": "ACxxxx", "authToken": "***" },
    "slack": { "botToken": "***" },
    "whatsapp": { "accessToken": "***" }
  }
}

## 2. Fetch Provider Configuration (Masked)

GET /api/integrations/notifications/config

Response example:

{
  "email": {
    "enabled": true,
    "host": "smtp.company.com",
    "port": 587,
    "secure": false,
    "username": "smtp-user",
    "password": "***",
    "fromAddress": "alerts@company.com",
    "fromName": "Safety Guardian Alerts"
  },
  "sms": {
    "enabled": true,
    "provider": "twilio",
    "apiBaseUrl": "https://api.twilio.com",
    "accountId": "ACxxxx",
    "authToken": "***",
    "fromNumber": "+15551234567"
  },
  "teams": { "enabled": true, "webhookUrl": "https://outlook.office.com/webhook/..." },
  "whatsapp": { "enabled": false, "apiBaseUrl": "https://graph.facebook.com", "accessToken": "***", "phoneNumberId": "123456" },
  "slack": { "enabled": true, "webhookUrl": "https://hooks.slack.com/services/...", "botToken": "***", "channel": "#safety-alerts" }
}

## 3. Test Connection per Provider

POST /api/integrations/notifications/test

Request body:

{
  "provider": "email",
  "payload": {
    "host": "smtp.company.com",
    "port": 587,
    "username": "smtp-user",
    "password": "***",
    "fromAddress": "alerts@company.com"
  }
}

Response body:

{
  "ok": true,
  "provider": "email",
  "status": "connected",
  "message": "SMTP authentication succeeded"
}

Possible error response:

{
  "ok": false,
  "provider": "slack",
  "status": "failed",
  "message": "Webhook returned 403"
}

## 4. Send Notification (Runtime)

POST /api/notifications/send

Request body:

{
  "eventType": "incident_reported",
  "message": "New high incident reported: Blocked emergency exit",
  "channels": ["in_app", "email", "sms", "teams", "slack"],
  "scope": {
    "buildingId": "building-1",
    "areaId": "area-1"
  },
  "recipients": [
    {
      "userId": "user-2",
      "name": "Responder",
      "email": "responder@company.com",
      "phone": "+15551234567"
    }
  ],
  "metadata": {
    "incidentId": "incident-123",
    "severity": "high"
  }
}

Response body:

{
  "ok": true,
  "summary": {
    "total": 5,
    "sent": 2,
    "queued": 2,
    "failed": 1
  },
  "deliveryResults": [
    { "channel": "in_app", "status": "sent" },
    { "channel": "email", "status": "queued" },
    { "channel": "sms", "status": "queued" },
    { "channel": "teams", "status": "sent" },
    { "channel": "slack", "status": "failed", "reason": "channel_not_found" }
  ]
}

## 5. Notification Delivery History

GET /api/notifications/history?status=failed&channel=email&page=1&pageSize=50

Response body:

{
  "items": [
    {
      "id": "notification-1",
      "eventType": "drill_started",
      "channel": "email",
      "status": "failed",
      "recipient": "responder@company.com",
      "message": "Emergency drill started (fire)",
      "createdAt": "2026-05-25T10:00:00Z",
      "deliveryNote": "SMTP timeout"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 50
}

## Validation Rules (Suggested)

- Email: host, port, username, password, fromAddress required when enabled.
- SMS: provider, apiBaseUrl, accountId, authToken, fromNumber required when enabled.
- Teams: webhookUrl required when enabled.
- WhatsApp: apiBaseUrl, accessToken, phoneNumberId required when enabled.
- Slack: webhookUrl and channel required when enabled.

## Migration Path from Current Local Setup

1. Keep current local portal for non-production testing.
2. Replace localStorage save/load calls with authenticated backend endpoints.
3. Keep the same frontend payload shape to minimize UI refactoring.
4. Move connection tests to backend and return structured pass/fail results.
5. Route live sends through queue-backed backend services.
