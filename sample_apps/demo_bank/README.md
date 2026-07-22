# DemoBank analytics

DemoBank sends only the typed `events` columns defined in
`database/init/001_init.sql`. No analytics event contains a `properties` JSON
object. Each request has `site_id`, `name`, `url`, `client_ts`, and, when
available, the schema fields below:

| Purpose | Columns |
| --- | --- |
| Screen navigation | `name=screen_view`, `screen_name` |
| Product interaction | `name=offering_click`, `screen_name`, `item_type`, `item_id`, `item_label` |
| Multi-step process | `name=flow_step`, `flow_name`, `step_number`, `step_name` |
| Process outcome | `name=flow_completed` or `flow_abandoned`, `flow_name`, `step_number` |
| Validation | `name=form_error`, `screen_name`, `element_label` (the invalid field) |
| UI action | `name=button_click`, `screen_name`, `element_label` |

## Identity and session

`public/tracker.js` creates a session UUID in `sessionStorage` for every browser
session. It is sent in `session_id` on every event. `identifyUser(userId)` is
called after a successful login; it stores the application user ID and sends it
as `visitor_id` on subsequent events. Sign-out clears that identifier while the
anonymous session continues. This is intentionally a user identifier, not an
email or any form input.

## Tracked processes

### Public browsing

1. Opening the landing page records `screen_view(landing)`.
2. Header/footer links and hero actions record `button_click`.
3. Selecting an offering records `offering_click` with its schema-supported
   item type, ID, and human-readable label.
4. Opening an offering detail page records its `screen_view`; Apply and Contact
   actions record `button_click`/`offering_click`.

### Sign up and sign in

1. Opening either form records its screen view.
2. Missing required fields record one `form_error` per field.
3. Account selection and form submission record `button_click`.
4. Completing sign-up records `flow_completed` for `account_opening`.
5. A successful sign-in sets `visitor_id`, then records the sign-in action and
   any post-login continuation as `button_click` events.

### Dashboard and products

1. Dashboard entry records `screen_view(dashboard)`.
2. Quick actions and add/explore actions record `button_click`.
3. Existing holdings and suggested products record `offering_click`; the item
   ID identifies the selected product or holding.
4. Signing out records `button_click` before clearing the user identifier.

### Product application

1. Each application page records a screen view.
2. Selecting a product and navigating forward records UI actions.
3. The form records `form_error` for each incomplete field.
4. Progress through product selection, personal information, financial
   information, and review records `flow_step` for `apply_<category>`.
5. Submission records `flow_completed` with the selected product as `item_id`.

### Loan application

1. The loan route starts `loan_application` and tracks its screen/flow steps.
2. Amount, purpose, employer, and income validation failures are `form_error`.
3. Next, upload, review, submit, and return actions are `button_click`.
4. A successful submission emits `flow_completed`; leaving the loan route or
   closing the page before completion emits `flow_abandoned` with the last
   `step_number`.

### Transfers

1. The transfer flow records screen and `flow_step` events for recipient,
   amount, review, and success screens.
2. Invalid recipient or amount values record `form_error`.
3. Continue and confirm interactions record `button_click`.
4. Confirmation records `flow_completed`; leaving early records
   `flow_abandoned`.

### Contact

1. Opening the form records `screen_view(contact)`.
2. Empty name, email, or message fields record `form_error`.
3. Topic selection, submission, repeat submission, and returning home record
   `button_click` with an `element_label`.
4. The message itself is submitted to the separate typed `/feedback` endpoint
   and stored in the `feedback` table; it is not placed in an event payload.

## Adding a call

Use the `track` helper from `src/lib/analytics.ts`. It accepts only the database
event names and translates UI convenience labels into typed schema columns:

```ts
track("offering_click", {
  screen_name: "dashboard",
  item_type: "credit_card",
  item_id: "cc_cash_rewards",
  item_label: "Cash Rewards",
});
```

Do not add `properties`, arbitrary event names, PII, or financial form values.
The collector validates and inserts the same typed fields into PostgreSQL.
