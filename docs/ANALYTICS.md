# Private Electroys analytics

The user selected private analytics and personal likes, not public totals. No shared vote database or public visitor counter is used. The existing property uses measurement ID `G-1H82DFLP86`; no secret/API key is embedded in the site.

## Counts and reports

Open the existing property in [Google Analytics](https://analytics.google.com/). Access requires its Google account; website code cannot read private report totals.

- **Visitors:** use the Users metrics in the standard reports for a chosen date range. Page views and sessions are different counts, not interchangeable visitor totals. Existing page-view collection is retained; no duplicate custom visit event was added.
- **Product referrals:** filter Event name to `product_outbound_click` and use Event count. This event means a click on a catalogued product's external retailer/provider link, not a purchase or confirmed arrival. It covers catalog/collection cards, homepage product links, Quick Look and featured recommendations. Non-product brand/reference links are excluded.
- **Personal feedback changes:** `product_reaction` carries `reaction` (`like`, `dislike`, `clear`) and `previous_reaction`. Event totals are interaction changes, not a site's current unique voter count or public rating.

Each referral event carries `product_id`, a bounded public `product_name`, `link_id` (the same canonical product ID), `link_domain`, `outbound` and a bounded `surface` label. No destination query strings, full destination URLs, free-text requests or newsletter fields are sent by this module. Canonical product IDs map to titles in products.json.

For readable custom reports, an owner with Editor access can register event-scoped custom dimensions for `product_id`, `product_name`, `reaction`, and `surface` under Admin → Custom definitions, then create an Exploration with product ID/name rows, Event count values and an event-name filter. Product referral totals can be checked by event name without registering a product breakdown first. Standard Link ID/Link domain dimensions may also be useful. New custom-dimension reports can take 24–48 hours; use Realtime to inspect arriving events sooner.

Do not add all GA events together as a product-click count: enhanced-measurement `click` may coexist with the dedicated product event. Use only `product_outbound_click` for this definition. No historical clicks are reconstructed or invented. Analytics blockers, browser privacy settings and filtering affect measurements, so totals are measured activity rather than an exact headcount of people. QA activity should be considered when reviewing the release date.

## Preference behavior

`electroys.product-preferences.v1` stores one local choice per product. Selecting the opposite choice replaces it; selecting the active choice clears it. Preferences survive pagination, filters and reloads when local storage works, synchronize between same-origin tabs, and remain usable for the current visit when storage is blocked. The UI exposes the fallback. They are not sent to a new database or synchronized between devices.

Custom interaction events are suppressed on preview/fixture hosts and when GPC or DNT is enabled. This does not change or make promises about the pre-existing Google tag's separate collection. Analytics failure never blocks a preference or retailer navigation.

## Validation and access limits

Run `node --test tests/engagement.test.js` for storage corruption, mutually exclusive choices, malformed/oversized input, privacy controls, safe outbound metadata and a mocked GA4 event queue. Browser tests should verify persistence across page/filter rebuilds, clear/switch behavior, keyboard interaction, blocked storage and narrow layouts. Never claim a mock queue proves Google received an event. Actual report receipt/aggregation requires authenticated Analytics access.

Primary references: [Google tag event setup](https://developers.google.com/analytics/devguides/collection/ga4/events), [enhanced measurement and outbound clicks](https://support.google.com/analytics/answer/9216061), [custom dimensions](https://support.google.com/analytics/answer/14240153).
