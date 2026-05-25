# Safety Guardian Pro Quick Start

## 1. Sign in

Use one of the default accounts:

- Admin: admin@safeguard.local / Admin@123
- User: safety.officer@safeguard.local / User@123

## 2. Learn the main areas

- Dashboard: overview and quick actions
- Incidents: incident lifecycle and analytics
- Drills: schedule/start/end drills and export history
- Safety Check-In: personnel accountability during drills
- Admin: settings, permissions, and logs

## 3. Run a basic drill scenario

1. Open Drills and start a drill.
2. Open Safety Check-In and record several personnel statuses.
3. End the drill.
4. Return to Drills > History and Stats and export the report.

## 4. Use screenshots while onboarding

See the full guide with screenshots at:

- [README.md](./README.md)
- [screenshots/01-login.png](./screenshots/01-login.png)
- [screenshots/02-dashboard.png](./screenshots/02-dashboard.png)
- [screenshots/03-incidents.png](./screenshots/03-incidents.png)
- [screenshots/04-drills.png](./screenshots/04-drills.png)
- [screenshots/05-checkin.png](./screenshots/05-checkin.png)
- [screenshots/06-admin.png](./screenshots/06-admin.png)
- [screenshots/07-public-safety-checkin.png](./screenshots/07-public-safety-checkin.png)

## 5. Role and printable guides

- [Admin manual](./roles/ADMIN_MANUAL.md)
- [Safety officer manual](./roles/SAFETY_OFFICER_MANUAL.md)
- [Staff manual](./roles/STAFF_MANUAL.md)
- [Annotated screenshots](./annotated/README.md)
- [PDF print guide](./print/PDF_PRINT_GUIDE.md)

## 6. Notification integration APIs

- [Notification integrations API guide](../NOTIFICATION_INTEGRATIONS_API.md)
- [OpenAPI contract (backend-ready)](../NOTIFICATION_INTEGRATIONS_OPENAPI_CONTRACT.yaml)
- [OpenAPI contract (JSON)](../NOTIFICATION_INTEGRATIONS_OPENAPI_CONTRACT.json)

## 7. Compliance calendar and missed checks

- The dashboard now separates overdue compliance items into two groups:
	- Overdue Checks (non-training compliance checks)
	- Overdue Training (training assignments)
- The Safety Compliance Score popup now has two separate actions:
	- View Overdue Checks
	- View Overdue Training
- Overdue checks are automatically logged as missed/incomplete once their due date passes.
- Missed/incomplete checks count against the Safety Compliance Score.
- Training Not Done outcomes are tracked and penalized separately from overdue checks.
- Assigned users are notified when their compliance checks are missed.
- You can assign checks by user and by safety role, then scope those checks to specific buildings, floors, and office areas.
- Users only see and update checks that match their assignment and allocated office area.
- Completing a missed check resolves it from missed/incomplete and it no longer counts as missed.
- Monthly recurring checks support: same date each month, last day of month, last working day of month, or a specific week + weekday of month.

### Missed compliance report (Admin)

- Go to Admin -> Compliance & Safety Checks.
- Open the Missed Compliance Report card.
- Filter by date range, safety role, and office area.
- Export filtered results as CSV or JSON for audit and management reporting.
