const THEME = {
  bg: '#1A1B26',
  card: 'rgba(30, 32, 48, 0.7)',
  primary: '#7C6AEF',
  accent: '#F472B6',
  cyan: '#22D3EE',
  text: '#E8E8ED',
  muted: '#8B8FA3',
  border: 'rgba(124, 106, 239, 0.2)',
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '36px' }}>
      <h2 style={{ fontSize: '18px', fontWeight: '600', color: THEME.accent, marginBottom: '12px', borderBottom: `1px solid ${THEME.border}`, paddingBottom: '8px' }}>
        {title}
      </h2>
      <div style={{ color: THEME.muted, fontSize: '15px', lineHeight: '1.75' }}>
        {children}
      </div>
    </div>
  )
}

function P({ children }) {
  return <p style={{ marginBottom: '10px' }}>{children}</p>
}

function Li({ children }) {
  return <li style={{ marginBottom: '6px', paddingLeft: '4px' }}>{children}</li>
}

export default function Privacy() {
  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, color: THEME.text, fontFamily: "'Inter', sans-serif", padding: '0 16px 60px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', paddingTop: '48px' }}>

        <a href="/" style={{ display: 'inline-block', marginBottom: '32px', color: THEME.primary, fontSize: '14px', textDecoration: 'none' }}>
          ← Back to Roamie
        </a>

        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Privacy Policy
        </h1>
        <p style={{ color: THEME.muted, fontSize: '13px', marginBottom: '40px' }}>
          Last updated: May 2025
        </p>

        <Section title="1. Who We Are">
          <P>Roamie ("we", "us", "our") is a travel planning service that helps couples find destinations they can both afford. Our website is roamietravel.app. For privacy questions, contact us at hutchiesonty25@gmail.com.</P>
        </Section>

        <Section title="2. Information We Collect">
          <P>We collect the following types of information:</P>
          <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>
            <Li><strong style={{ color: THEME.text }}>Account data:</strong> Your email address when you sign up or log in via Supabase Auth.</Li>
            <Li><strong style={{ color: THEME.text }}>Travel preferences:</strong> Cities, budgets, travel dates, accommodation type, and travel vibes you enter during the quiz.</Li>
            <Li><strong style={{ color: THEME.text }}>Location (city):</strong> The home city you provide — we never request GPS or device location.</Li>
            <Li><strong style={{ color: THEME.text }}>Payment information:</strong> If you subscribe to Roamie Pro, Stripe processes your card. We do not store card numbers — only a Stripe customer ID and subscription status.</Li>
            <Li><strong style={{ color: THEME.text }}>Usage data:</strong> Pages visited, button clicks, and session events collected via PostHog analytics.</Li>
          </ul>
          <P>We do not collect passport details, real names, or precise GPS coordinates.</P>
        </Section>

        <Section title="3. How We Use Your Information">
          <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>
            <Li>To generate personalised trip recommendations using the AI model (Claude by Anthropic).</Li>
            <Li>To authenticate your account and save your trip history.</Li>
            <Li>To process subscription payments via Stripe.</Li>
            <Li>To send transactional emails — we do not send unsolicited marketing unless you opt in.</Li>
            <Li>To analyse product usage and improve the service (PostHog).</Li>
          </ul>
        </Section>

        <Section title="4. Data Storage — Supabase">
          <P>Your account and trip data is stored in Supabase, a hosted Postgres database. Data is stored in the EU (Ireland) region by default. Supabase is SOC 2 Type II certified. You can request deletion of your data at any time by emailing hutchiesonty25@gmail.com and we will remove it within 30 days.</P>
        </Section>

        <Section title="5. Payments — Stripe">
          <P>Payments are handled by Stripe, Inc. When you subscribe, your card details are entered directly into Stripe's secure form and never touch our servers. We store only a Stripe customer ID and your subscription status. Stripe's privacy policy is available at stripe.com/privacy.</P>
        </Section>

        <Section title="6. Analytics — PostHog">
          <P>We use PostHog to understand how people use Roamie. PostHog collects anonymised event data (page views, feature usage) and does not track you across other websites. We do not use this data to build advertising profiles. You can opt out of analytics by enabling Do Not Track in your browser. PostHog's privacy policy is at posthog.com/privacy.</P>
        </Section>

        <Section title="7. Third-Party Affiliate Partners">
          <P>Roamie may display links to third-party services including:</P>
          <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>
            <Li><strong style={{ color: THEME.text }}>Booking.com</strong> — hotel and accommodation search. Clicking affiliate links may earn Roamie a commission.</Li>
            <Li><strong style={{ color: THEME.text }}>Viator</strong> — tours and activities. Affiliate links may earn Roamie a commission.</Li>
            <Li><strong style={{ color: THEME.text }}>Wise</strong> — international money transfers. Referral links may earn Roamie a reward.</Li>
          </ul>
          <P>Clicking these links will take you to third-party websites governed by their own privacy policies. Roamie is not responsible for their data practices. Affiliate links do not affect the recommendations we show you — we never rank destinations based on commission potential.</P>
        </Section>

        <Section title="8. Data Sharing">
          <P>We do not sell your personal data. We share data only with:</P>
          <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>
            <Li>Supabase (database hosting)</Li>
            <Li>Stripe (payment processing)</Li>
            <Li>Anthropic (AI model — your travel preferences are sent to generate recommendations; Anthropic does not retain this data for training per their API terms)</Li>
            <Li>PostHog (usage analytics)</Li>
            <Li>Perplexity AI (flight price lookups — no personal data is sent, only destination names)</Li>
          </ul>
        </Section>

        <Section title="9. Cookies">
          <P>We use localStorage (not cookies) to store your quiz answers and unlock status locally in your browser. We do not use advertising or tracking cookies. PostHog may set a first-party analytics cookie.</P>
        </Section>

        <Section title="10. Your Rights">
          <P>Depending on your location, you may have rights under GDPR, UK GDPR, CCPA, or other laws, including:</P>
          <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>
            <Li>Access to the personal data we hold about you</Li>
            <Li>Correction of inaccurate data</Li>
            <Li>Deletion of your account and associated data</Li>
            <Li>Restriction or objection to processing</Li>
            <Li>Data portability</Li>
          </ul>
          <P>To exercise any of these rights, email hutchiesonty25@gmail.com. We will respond within 30 days.</P>
        </Section>

        <Section title="11. Children">
          <P>Roamie is not directed at children under 16. We do not knowingly collect data from anyone under 16. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.</P>
        </Section>

        <Section title="12. Changes to This Policy">
          <P>We may update this policy from time to time. We will post the updated version on this page with a new "last updated" date. Continued use of Roamie after changes constitutes acceptance of the revised policy.</P>
        </Section>

        <Section title="13. Contact">
          <P>For any privacy questions or requests: <a href="mailto:hutchiesonty25@gmail.com" style={{ color: THEME.cyan }}>hutchiesonty25@gmail.com</a></P>
        </Section>

      </div>
    </div>
  )
}
