export default function PrivacyPage() {
  const heading2Style = {
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#E8ECF4",
    letterSpacing: "-0.01em",
    marginBottom: "16px",
  } as React.CSSProperties;

  const paragraphStyle = {
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: "16px",
    lineHeight: 1.7,
    color: "#8B95B0",
    marginBottom: "16px",
  } as React.CSSProperties;

  const listStyle = {
    fontFamily: "'Source Sans 3', sans-serif",
    fontSize: "16px",
    lineHeight: 1.7,
    color: "#8B95B0",
    paddingLeft: "20px",
    marginBottom: "16px",
    listStyleType: "none",
  } as React.CSSProperties;

  const listItemStyle = {
    position: "relative" as const,
    paddingLeft: "16px",
    marginBottom: "6px",
  } as React.CSSProperties;

  const bulletStyle = {
    position: "absolute" as const,
    left: 0,
    color: "#4F8BFF",
  } as React.CSSProperties;

  return (
    <section style={{ paddingTop: "80px", paddingBottom: "96px" }} className="px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[720px]">
        <h1
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: "2.5rem",
            fontWeight: 700,
            color: "#E8ECF4",
            letterSpacing: "-0.02em",
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ color: "#5A6480", fontSize: "14px", marginTop: "8px", fontFamily: "'Source Sans 3', sans-serif" }}>
          Last updated: March 14, 2026
        </p>

        <div style={{ marginTop: "48px" }}>
          <p style={paragraphStyle}>
            BossBoard (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the mybossboard.com website and
            platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your
            information when you use our service.
          </p>
        </div>

        <div style={{ marginTop: "40px" }}>
          <h2 style={heading2Style}>1. Information We Collect</h2>
          <p style={paragraphStyle}>
            We collect information that you provide directly to us when you create an account, use our
            platform, or communicate with us. This includes:
          </p>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Name, email address, and account credentials
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Business information such as company name, industry, and team size
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              SOP content, checklists, and other materials you create on the platform
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Usage data including page views, feature interactions, and session information
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Payment and billing information processed through our payment provider
            </li>
          </ul>
        </div>

        <div style={{ marginTop: "48px" }}>
          <h2 style={heading2Style}>2. How We Use Your Data</h2>
          <p style={paragraphStyle}>We use the information we collect to:</p>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Provide, maintain, and improve the BossBoard platform
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Process your SOP content through AI to generate, summarize, and enhance standard operating
              procedures
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Send transactional emails such as account confirmations, password resets, and team invitations
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Analyze usage patterns to improve product features and user experience
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Respond to your support requests and communications
            </li>
          </ul>
          <p style={paragraphStyle}>
            Your SOP content is processed by AI solely to deliver the features you request. We do not use
            your content to train AI models or share it with other customers.
          </p>
        </div>

        <div style={{ marginTop: "36px" }}>
          <h2 style={heading2Style}>3. Third-Party Services</h2>
          <p style={paragraphStyle}>
            We rely on trusted third-party services to operate BossBoard. Each provider has its own privacy
            policy governing the data they process:
          </p>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              <strong style={{ color: "#E8ECF4" }}>Supabase</strong> — Database hosting, user
              authentication, and file storage
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              <strong style={{ color: "#E8ECF4" }}>Anthropic (Claude)</strong> — AI processing for SOP
              generation, summarization, and insights
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              <strong style={{ color: "#E8ECF4" }}>Paddle</strong> — Payment processing and subscription
              management
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              <strong style={{ color: "#E8ECF4" }}>Resend</strong> — Transactional email delivery
            </li>
          </ul>
          <p style={paragraphStyle}>
            We do not sell your personal information to any third party. Data shared with these providers is
            limited to what is necessary to deliver our services.
          </p>
        </div>

        <div style={{ marginTop: "48px" }}>
          <h2 style={heading2Style}>4. Cookies</h2>
          <p style={paragraphStyle}>
            We use cookies and similar technologies to maintain your session, remember your preferences, and
            understand how you use BossBoard. Specifically:
          </p>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              <strong style={{ color: "#E8ECF4" }}>Session cookies</strong> — Required to keep you signed in
              and maintain your workspace context
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              <strong style={{ color: "#E8ECF4" }}>Analytics cookies</strong> — Help us understand feature
              usage and improve the product. You can opt out of analytics cookies in your account settings
            </li>
          </ul>
          <p style={paragraphStyle}>
            We do not use third-party advertising cookies or tracking pixels.
          </p>
        </div>

        <div style={{ marginTop: "40px" }}>
          <h2 style={heading2Style}>5. Data Retention and Deletion</h2>
          <p style={paragraphStyle}>
            We retain your data for as long as your account is active or as needed to provide you with our
            services. When you delete your account, we will remove your personal information and SOP content
            within 30 days, except where we are required by law to retain certain records.
          </p>
          <p style={paragraphStyle}>
            Backups containing your data may persist for up to 90 days after deletion before being
            permanently purged from our systems.
          </p>
        </div>

        <div style={{ marginTop: "48px" }}>
          <h2 style={heading2Style}>6. Your Rights</h2>
          <p style={paragraphStyle}>You have the right to:</p>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Access the personal data we hold about you
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Export your SOPs, checklists, and other content in standard formats
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Correct inaccurate information in your account
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Delete your account and all associated data
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Opt out of non-essential communications
            </li>
          </ul>
          <p style={paragraphStyle}>
            To exercise any of these rights, contact us at the address below or use the account settings in
            your dashboard.
          </p>
        </div>

        <div style={{ marginTop: "40px" }}>
          <h2 style={heading2Style}>7. Security</h2>
          <p style={paragraphStyle}>
            We implement industry-standard security measures to protect your data, including encryption in
            transit (TLS) and at rest, regular security audits, and access controls. However, no method of
            electronic transmission or storage is completely secure, and we cannot guarantee absolute
            security.
          </p>
        </div>

        <div style={{ marginTop: "48px" }}>
          <h2 style={heading2Style}>8. Changes to This Policy</h2>
          <p style={paragraphStyle}>
            We may update this Privacy Policy from time to time. We will notify you of any material changes
            by posting the new policy on this page and updating the &quot;Last updated&quot; date. Your
            continued use of BossBoard after changes are posted constitutes your acceptance of the revised
            policy.
          </p>
        </div>

        <div style={{ marginTop: "40px" }}>
          <h2 style={heading2Style}>9. Contact Us</h2>
          <p style={paragraphStyle}>
            If you have questions about this Privacy Policy or your personal data, contact us at:
          </p>
          <p style={{ ...paragraphStyle, color: "#E8ECF4" }}>
            support@mybossboard.com
          </p>
        </div>
      </div>
    </section>
  );
}
