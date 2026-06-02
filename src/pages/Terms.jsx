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

export default function Terms() {
  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, color: THEME.text, fontFamily: "'Inter', sans-serif", padding: '0 16px 60px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', paddingTop: '48px' }}>

        <a href="/" style={{ display: 'inline-block', marginBottom: '32px', color: THEME.primary, fontSize: '14px', textDecoration: 'none' }}>
          ← Back to Roamie
        </a>

        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Terms of Service
        </h1>
        <p style={{ color: THEME.muted, fontSize: '13px', marginBottom: '40px' }}>
          Last updated: May 2025
        </p>

        <Section title="1. Acceptance of Terms">
          <P>By accessing or using Roamie ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service. These terms apply to all users, including visitors and registered account holders.</P>
        </Section>

        <Section title="2. What Roamie Provides">
          <P>Roamie is an AI-powered travel planning tool that suggests destinations and cost estimates for couples based on information you provide. The Service includes:</P>
          <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>
            <Li>AI-generated destination recommendations based on your cities, budgets, and preferences</Li>
            <Li>Estimated flight prices sourced from third-party data providers</Li>
            <Li>Estimated costs for accommodation, food, and activities</Li>
            <Li>Affiliate links to booking platforms (Booking.com, Viator, Wise)</Li>
          </ul>
          <P>All prices and recommendations are <strong style={{ color: THEME.text }}>estimates only</strong>. Roamie does not guarantee the accuracy of any price or availability information. Always verify prices directly with airlines, hotels, and booking platforms before making a purchase.</P>
        </Section>

        <Section title="3. Pricing and Purchases">
          <P>Roamie Pro is a subscription priced at <strong style={{ color: THEME.text }}>$5.99 USD per couple per month</strong>. A subscription gives both partners unlimited trip searches and full cost breakdowns.</P>
          <P>All prices are displayed in USD. Charges are processed by Stripe and billed monthly. You may cancel at any time from your account dashboard. By starting a subscription, you authorise the recurring monthly charge to your payment method.</P>
        </Section>

        <Section title="4. Refund Policy">
          <P>Because our product delivers digital content immediately upon purchase, <strong style={{ color: THEME.text }}>all sales are final and non-refundable</strong> unless required by applicable law.</P>
          <P>If you believe you were charged in error, or if the feature failed to unlock after a successful payment, contact us at hutchiesonty25@gmail.com within 14 days of purchase and we will investigate and resolve the issue promptly.</P>
          <P>Users in the EU or UK may have a statutory 14-day right of withdrawal for digital services. This right is waived once the digital content has been made available and you have acknowledged this by proceeding with the purchase.</P>
        </Section>

        <Section title="5. Affiliate Links and Disclaimers">
          <P>Roamie earns commission from affiliate partnerships with third-party services including Booking.com, Viator, and Wise. When you click an affiliate link and make a purchase or sign up, Roamie may receive a financial reward.</P>
          <P><strong style={{ color: THEME.text }}>Important disclaimers:</strong></P>
          <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>
            <Li>Affiliate relationships do not influence which destinations or services are recommended. We do not rank results based on commission potential.</Li>
            <Li>Roamie is not a travel agent. We are not a party to any booking you make through third-party platforms.</Li>
            <Li>Third-party platforms have their own terms, cancellation policies, and dispute processes. Roamie is not responsible for any transaction you complete on a third-party site.</Li>
            <Li>Flight prices shown are estimates sourced from data providers and may differ from prices available at time of booking.</Li>
          </ul>
        </Section>

        <Section title="6. User Responsibilities">
          <P>By using Roamie, you agree to:</P>
          <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>
            <Li>Provide accurate information in the quiz (incorrect data produces inaccurate recommendations)</Li>
            <Li>Not use the Service for any unlawful purpose</Li>
            <Li>Not attempt to reverse-engineer, scrape, or automate requests to the Service</Li>
            <Li>Not share your account credentials with others</Li>
          </ul>
        </Section>

        <Section title="7. User Content">
          <P>Any travel preferences, cities, or other information you submit to generate recommendations ("User Content") remains yours. By submitting User Content, you grant Roamie a limited, non-exclusive licence to process it solely for the purpose of providing the Service (e.g. sending it to the AI model to generate recommendations).</P>
          <P>We do not claim ownership over your User Content and do not use it for advertising or sell it to third parties.</P>
        </Section>

        <Section title="8. Intellectual Property">
          <P>All content on the Roamie website — including the brand name, logo, interface design, and original text — is owned by or licensed to Roamie. You may not copy, reproduce, or redistribute any part of the Service without our prior written consent.</P>
        </Section>

        <Section title="9. Disclaimer of Warranties">
          <P>The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not warrant that the Service will be uninterrupted, error-free, or that any information provided (including price estimates) will be accurate or complete.</P>
          <P>We are not liable for any travel decisions you make based on information from Roamie. Always conduct your own research and verify details before booking.</P>
        </Section>

        <Section title="10. Limitation of Liability">
          <P>To the maximum extent permitted by law, Roamie's total liability for any claim arising from use of the Service shall not exceed the amount you paid to Roamie in the 12 months preceding the claim. We are not liable for indirect, incidental, or consequential damages, including missed flights, lost bookings, or financial losses resulting from inaccurate price estimates.</P>
        </Section>

        <Section title="11. Governing Law">
          <P>These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales, except where mandatory consumer protection law in your country of residence requires otherwise.</P>
        </Section>

        <Section title="12. Changes to These Terms">
          <P>We may update these Terms from time to time. We will notify registered users by email of any material changes. Continued use of the Service after changes take effect constitutes acceptance of the updated Terms.</P>
        </Section>

        <Section title="13. Contact">
          <P>For questions about these Terms: <a href="mailto:hutchiesonty25@gmail.com" style={{ color: THEME.cyan }}>hutchiesonty25@gmail.com</a></P>
        </Section>

      </div>
    </div>
  )
}
