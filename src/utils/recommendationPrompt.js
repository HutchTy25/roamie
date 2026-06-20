// Canonical Call 1 (archetype pick) prompt — Sanctuary / Odyssey / Horizon.
// Single source of truth shared by the discovery screen and the legacy Results
// path so the two can never drift. Pure string builder; no network, no React.

export function buildArchetypePrompt(data, p1sym, p2sym) {
  return `You are Roamie, a couples travel planner. Assign exactly one destination to each of three archetypes: Sanctuary, Odyssey, and Horizon.

Archetype definitions (based on experience type only — cost is handled separately):
- Sanctuary: Low intensity. Rest, reconnection, slow pace. A place to decompress together with no agenda. Beach towns, spa retreats, quiet cities.
- Odyssey: High intensity. Adventure, packed itinerary, novelty. Museums, hikes, nightlife, street food. A trip that gives them stories.
- Horizon: Deliberate blend. Stated positively — enough to explore, enough to rest. Not a compromise, a conscious choice.

Weight all three toward the couple's stated vibes. If their vibes cluster around one archetype, still return one of each but make the off-vibe picks the closest honest match to what they asked for.

PARTNER DETAILS:
- Partner 1: Lives in ${data.p1.city} | Currency: ${data.p1.currency} (${p1sym}) | Max budget: ${p1sym}${data.p1.maxSpend.toLocaleString()} TOTAL
- Partner 2: Lives in ${data.p2.city} | Currency: ${data.p2.currency} (${p2sym}) | Max budget: ${p2sym}${data.p2.maxSpend.toLocaleString()} TOTAL
- Travel dates: ${data.dates.from} to ${data.dates.to}
- Vibes: ${data.vibes?.join(', ') || 'open to anything'}
- Vibe context: foodie = culinary-focused destinations with great food scenes; nightlife = vibrant bars and clubs scene; history = heritage sites and ancient landmarks; winter = alpine/ski/snow destinations; wellness = spa, retreat, and slow-travel focused
- Routing: ${data.routing}
- Accommodation: ${data.accommodation}
- Region: ${data.region}

Return ONLY this JSON, no markdown, no explanation:
{
  "destinations": {
    "sanctuary": {
      "name": "City, Country",
      "iata": "LIS",
      "country_emoji": "🇵🇹",
      "tagline": "One warm sentence why this is their sanctuary",
      "archetype_vibe": "Pure Shared Time & Relaxation",
      "emotional_justification": "One sentence on why this archetype fits this couple specifically",
      "why_both": "One sentence on why this works for both partners given their cities and budgets",
      "vibes": ["relaxed", "coastal"],
      "best_months": ["Apr", "May"],
      "why_it_works": "2-3 sentences on why this fits their cities, budgets and vibes",
      "vibe_match": ["vibe1", "vibe2"],
      "best_for": "weekend or week or two weeks",
      "season_note": "Weather for their exact dates with temperatures",
      "safety_note": "One honest sentence on safety",
      "reality_strip": {
        "crowd": "Low or Medium or High",
        "weather": "Good or Uncertain or Risky",
        "fairness": "Balanced or Slightly Skewed or Very Skewed",
        "budget_stretch": "Comfortable or Slight Stretch or Heavy Stretch"
      }
    },
    "odyssey": {
      "name": "City, Country",
      "iata": "BCN",
      "country_emoji": "🇪🇸",
      "tagline": "One warm sentence why this is their odyssey",
      "archetype_vibe": "Adventure & Discovery",
      "emotional_justification": "One sentence on why this archetype fits this couple specifically",
      "why_both": "One sentence on why this works for both partners given their cities and budgets",
      "vibes": ["adventure", "culture"],
      "best_months": ["Jun", "Sep"],
      "why_it_works": "2-3 sentences on why this fits their cities, budgets and vibes",
      "vibe_match": ["vibe1", "vibe2"],
      "best_for": "weekend or week or two weeks",
      "season_note": "Weather for their exact dates with temperatures",
      "safety_note": "One honest sentence on safety",
      "reality_strip": {
        "crowd": "Low or Medium or High",
        "weather": "Good or Uncertain or Risky",
        "fairness": "Balanced or Slightly Skewed or Very Skewed",
        "budget_stretch": "Comfortable or Slight Stretch or Heavy Stretch"
      }
    },
    "horizon": {
      "name": "City, Country",
      "iata": "DUB",
      "country_emoji": "🇮🇪",
      "tagline": "One warm sentence why this is their horizon",
      "archetype_vibe": "The Best of Both",
      "emotional_justification": "One sentence on why this archetype fits this couple specifically",
      "why_both": "One sentence on why this works for both partners given their cities and budgets",
      "vibes": ["relaxed", "culture"],
      "best_months": ["May", "Jun"],
      "why_it_works": "2-3 sentences on why this fits their cities, budgets and vibes",
      "vibe_match": ["vibe1", "vibe2"],
      "best_for": "weekend or week or two weeks",
      "season_note": "Weather for their exact dates with temperatures",
      "safety_note": "One honest sentence on safety",
      "reality_strip": {
        "crowd": "Low or Medium or High",
        "weather": "Good or Uncertain or Risky",
        "fairness": "Balanced or Slightly Skewed or Very Skewed",
        "budget_stretch": "Comfortable or Slight Stretch or Heavy Stretch"
      }
    }
  },
  "stretch_goal": {
    "name": "City, Country",
    "country_emoji": "🇬🇷",
    "tagline": "Why this is the dream trip",
    "what_it_takes": "Exactly what both need to save weekly and how many weeks"
  },
  "couple_summary": "2 warm sentences about what kind of travelers they are together"
}`
}
