# Bookings model — design notes

Companion to `20260619120000_create_bookings.sql`. Captures the *why* behind the
schema so the reasoning survives outside the conversation it came from.

The `bookings` table backs the couples' financial trip-planning model: each row
is one booking line item (flight / hotel / transport / other) attached to a
trip, tracking who paid, whose cost it is, the FX rate locked at payment, a
settlement status, and a cancellation/payment deadline.

---

## 1. Currency model — the FX anchor is the destination currency

`price_amount` + `price_currency` is the booking's ground truth (what the
receipt says). `fx_rate_locked` converts **`price_currency → trips.destination_currency`**,
captured once at `fx_locked_at`, so later rate drift never changes what a partner
owes. `fx_rate_locked` and `fx_locked_at` lock together or not at all (enforced
by a CHECK).

**Why destination currency, not USD or a home currency:** the product anchors
every booking's displayed price to the trip's destination currency so the couple
sees one coherent trip total. USD would be a neutral compute base but isn't what
the product shows; either partner's home currency would privilege one side.

**Where destination currency lives:** a new `trips.destination_currency` column
(plus `trips.destination_iata`), *not* the `destinations` jsonb. The jsonb holds
the three archetype cards (Sanctuary / Odyssey / Horizon) per recommendation set
— wrong granularity, since a booking anchors to the single committed
destination. `trips` already snapshots the chosen destination
(`destination_name`, `country_emoji`, `p1_cost`, `p2_cost`), so the anchor sits
naturally alongside as a single, indexable scalar.

**How it's populated:** resolved **server-side only** at trip save/commit time
from a static IATA/country → ISO-4217 map (same pattern as `COL_INDEX` /
`getCityIATA` overrides), default `USD`, manual override allowed. The client
never duplicates this map — it only reads the column. Keeping currency
resolution deterministic and server-side avoids LLM-hallucinated currency codes.

### `computeTripCosts()` (estimate) vs. the bookings ledger

These are two separate layers and must stay decoupled. `computeTripCosts()` is a
forecasting surface that runs on every search (including logged-out preview) and
depends on USD + live rates + its cache; bookings are the post-decision ledger
with locked rates. Coupling them would force the estimate engine to know about
destination currency and locked rates, breaking its caching and preview use.

| | `computeTripCosts()` — estimate layer | `bookings` — ledger layer |
|---|---|---|
| Anchor | USD (Duffel returns USD; neutral compute base) | destination currency (`trips.destination_currency`) |
| Rates | live Frankfurter, recomputed every search | locked once at `fx_locked_at` |
| Output | per-partner, each in **home** currency, ephemeral | per line item, anchored, persistent |
| Lifecycle | recomputes on every search | locked forever once set |
| Purpose | recommendation cards / browsing | actual money tracking + settlement |

They only meet at **read time**: a Dashboard reconciliation comparing the
estimated `p1_cost`/`p2_cost` snapshot against the actual sum of bookings. That's
a comparison, not a coupling — neither engine calls the other.

---

## 2. Budget model — two independent levels

Two pairs of budget columns, same names at different grains, **neither derived
from nor summed into the other**:

- `couples.budget_total` / `couples.budget_currency` — portfolio-level "how much
  have we committed across all our trips", shown on the home dashboard.
- `trips.budget_total` / `trips.budget_currency` — that trip's own independent
  affordability-ring target.

A trip's budget is *not* a slice of the couple total, and the couple total is
*not* a sum of trip budgets. They answer different product questions and move
independently.

(Per-partner quiz budgets `trips.p1_budget` / `trips.p2_budget` already exist and
are distinct again — they feed the ownership *suggestion*, see §4.)

---

## 3. `owner_id` vs `payer_id` — a stored decision, never auto-derived

- `payer_id` — the profile that actually paid (NULL until paid/assigned).
- `owner_id` — the profile whose cost it is, independent of who paid. This is
  what drives settlement when one partner fronts a booking that economically
  belongs to the other.

`owner_id` is a **direct profile FK set explicitly by a partner** on create/edit.
The budget-comparison recommendation (plain code: compare the two stated budgets,
and if one is significantly higher — e.g. a ≥~20% gap — suggest that partner
covers a larger share) is **computed live in the app and never written to the
DB**. The threshold lives in code/config, not the schema.

**Why not auto-write the suggestion into `owner_id`:**
- It's a financial fact with settlement consequences; auto-deriving it would blur
  "system guessed" vs. "couple agreed" — exactly the distinction money disputes
  hinge on.
- Recompute hazard: if `owner_id` tracked the budget gap, a later budget edit
  could silently flip ownership of an already-booked item.

No `suggested_owner_id` column is added. The inputs (`p1_budget` / `p2_budget`)
are already persisted, so the suggestion is cheaply re-derivable; persisting it
would only add staleness. Add a nullable `suggested_owner_id` snapshot *later*
only if product needs provenance ("what did the system suggest at the time we
decided", which a live recompute can't reconstruct after budgets change).

Both `payer_id` and `owner_id` are `ON DELETE SET NULL` — removing a profile must
never delete trip history.

---

## 4. p1/p2 → profile_id resolution (for the advisory suggestion)

The ownership suggestion needs to map the two stated budgets onto real profile
ids. Resolution rule:

- **`p1 = trips.user_id`** — the trip creator. Immutable (set once at insert,
  never reassigned) and viewer-independent: when the *non-creator* partner opens
  and edits the trip later, `p1` is still the creator and `p2` is still them.
  Stable for the life of the trip.
- **`p2 = the `couples` partner that isn't `trips.user_id``** — resolved live
  from `couples.partner1_id` / `partner2_id`. Stable only while couple membership
  is unchanged; a partner swap or disconnect→reconnect-with-someone-new would
  re-resolve `p2` to a different/absent profile on an old trip.

**Why the live `p2` resolution is acceptable without an extra column:** `p2`
resolution only feeds the *advisory suggestion*, which is ephemeral — worst case
after a swap is a stale nudge the user ignores, with zero effect on stored data.
The thing that carries financial weight, `owner_id`, is a direct FK that **never
re-resolves through p1/p2 once set**, so the actual decision is durable across any
couple-membership change.

**Optional future hardening (not in this migration):** snapshot the partner's
profile id onto the trip (`trips.partner_id`) at creation so even the suggestion
stays correct after a swap. Deferred because `owner_id` already makes the record
durable and it wasn't needed for the stored model.

---

## 5. Access control

RLS on `bookings` grants full access to the trip owner (`trips.user_id`) or
either partner of the couple the trip belongs to, resolved directly against
`couples.partner1_id` / `partner2_id` so it survives `profiles.couple_id` drift.

---

## Status

Migration written, **not yet applied**. Before applying, verify against the live
Supabase schema: (a) `gen_random_uuid()` is the UUID default in use (vs.
`uuid_generate_v4()`), and (b) `trips.id` / `profiles.id` are `uuid` PKs.
