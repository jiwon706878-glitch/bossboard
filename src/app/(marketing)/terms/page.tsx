export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p style={{ color: "#5A6480", fontSize: "14px", marginTop: "8px", fontFamily: "'Source Sans 3', sans-serif" }}>
          Last updated: March 14, 2026
        </p>

        <div style={{ marginTop: "48px" }}>
          <h2 style={heading2Style}>1. Acceptance of Terms</h2>
          <p style={paragraphStyle}>
            By accessing or using BossBoard (&quot;the Service&quot;), operated at mybossboard.com, you agree
            to be bound by these Terms of Service. If you do not agree to these terms, do not use the
            Service. These terms apply to all users, including workspace owners, administrators, and team
            members.
          </p>
        </div>

        <div style={{ marginTop: "40px" }}>
          <h2 style={heading2Style}>2. Description of Service</h2>
          <p style={paragraphStyle}>
            BossBoard is an AI-powered operations platform that helps business owners create, manage, and
            distribute standard operating procedures (SOPs). The Service includes:
          </p>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              AI-assisted SOP generation from text and voice input
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Team management, onboarding paths, and role-based access
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Checklists, read tracking, and compliance tools
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              A daily operations dashboard with AI-generated insights
            </li>
          </ul>
        </div>

        <div style={{ marginTop: "48px" }}>
          <h2 style={heading2Style}>3. Account Registration</h2>
          <p style={paragraphStyle}>
            To use BossBoard, you must create an account with accurate and complete information. You are
            responsible for maintaining the security of your account credentials and for all activity that
            occurs under your account. You must notify us immediately of any unauthorized access.
          </p>
          <p style={paragraphStyle}>
            Workspace owners are responsible for managing team member access and ensuring their team complies
            with these terms.
          </p>
        </div>

        <div style={{ marginTop: "40px" }}>
          <h2 style={heading2Style}>4. Acceptable Use</h2>
          <p style={paragraphStyle}>You agree not to use BossBoard to:</p>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Violate any applicable laws or regulations
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Upload or generate content that is harmful, abusive, or infringes on the rights of others
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Attempt to gain unauthorized access to our systems or other users&apos; data
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Reverse-engineer, decompile, or otherwise attempt to extract the source code of the platform
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Use the Service to build a competing product or service
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Abuse AI generation features by submitting excessive or automated requests beyond your plan
              limits
            </li>
          </ul>
        </div>

        <div style={{ marginTop: "48px" }}>
          <h2 style={heading2Style}>5. Intellectual Property</h2>
          <p style={paragraphStyle}>
            You retain full ownership of the SOPs, checklists, and other content you create on BossBoard. We
            do not claim any intellectual property rights over your content.
          </p>
          <p style={paragraphStyle}>
            The BossBoard platform, including its design, code, branding, and underlying technology, is owned
            by BossBoard and protected by intellectual property laws. You may not copy, modify, or distribute
            any part of the platform without our written permission.
          </p>
        </div>

        <div style={{ marginTop: "40px" }}>
          <h2 style={heading2Style}>6. AI-Generated Content</h2>
          <p style={paragraphStyle}>
            BossBoard uses artificial intelligence to generate and enhance SOPs, checklists, and operational
            insights. While we strive for accuracy, AI-generated content may contain errors, omissions, or
            inaccuracies.
          </p>
          <p style={paragraphStyle}>
            You are responsible for reviewing, verifying, and approving all AI-generated content before
            publishing or distributing it to your team. AI-generated SOPs should be treated as drafts that
            require human review, especially for safety-critical or compliance-sensitive procedures.
          </p>
        </div>

        <div style={{ marginTop: "48px" }}>
          <h2 style={heading2Style}>7. Payment Terms</h2>
          <p style={paragraphStyle}>
            Paid plans are billed monthly or annually through our payment processor, Paddle. By subscribing
            to a paid plan, you authorize recurring charges at the applicable rate.
          </p>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Prices are listed on our pricing page and may change with 30 days&apos; notice
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              You may cancel your subscription at any time; access continues until the end of the current
              billing period
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Refunds are handled on a case-by-case basis; contact support within 14 days of a charge for
              refund requests
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Downgrading to a lower plan may result in loss of access to features or data beyond the new
              plan&apos;s limits
            </li>
          </ul>
        </div>

        <div style={{ marginTop: "40px" }}>
          <h2 style={heading2Style}>8. Limitation of Liability</h2>
          <p style={paragraphStyle}>
            To the maximum extent permitted by law, BossBoard and its affiliates shall not be liable for any
            indirect, incidental, special, consequential, or punitive damages, including loss of profits,
            data, or business opportunities, arising out of or related to your use of the Service.
          </p>
          <p style={paragraphStyle}>
            Our total liability for any claim arising from these terms or the Service shall not exceed the
            amount you paid to BossBoard in the twelve months preceding the claim.
          </p>
        </div>

        <div style={{ marginTop: "48px" }}>
          <h2 style={heading2Style}>9. Termination</h2>
          <p style={paragraphStyle}>
            You may terminate your account at any time through your account settings. Upon termination:
          </p>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              You may export your SOPs and data before closing your account
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Your data will be deleted within 30 days, in accordance with our Privacy Policy
            </li>
            <li style={listItemStyle}>
              <span style={bulletStyle}>&bull;</span>
              Any outstanding payments remain due
            </li>
          </ul>
          <p style={paragraphStyle}>
            We reserve the right to suspend or terminate accounts that violate these terms, with notice where
            practicable.
          </p>
        </div>

        <div style={{ marginTop: "40px" }}>
          <h2 style={heading2Style}>10. Changes to Terms</h2>
          <p style={paragraphStyle}>
            We may revise these Terms of Service at any time. Material changes will be communicated via email
            or a prominent notice on the platform at least 30 days before taking effect. Your continued use
            of BossBoard after changes become effective constitutes acceptance of the revised terms.
          </p>
        </div>

        <div style={{ marginTop: "48px" }}>
          <h2 style={heading2Style}>11. Governing Law</h2>
          <p style={paragraphStyle}>
            These terms shall be governed by and construed in accordance with the laws of the State of
            Delaware, United States, without regard to its conflict of law provisions. Any disputes arising
            under these terms shall be resolved in the courts located in Delaware.
          </p>
        </div>

        <div style={{ marginTop: "40px" }}>
          <h2 style={heading2Style}>12. Contact Us</h2>
          <p style={paragraphStyle}>
            If you have questions about these Terms of Service, contact us at:
          </p>
          <p style={{ ...paragraphStyle, color: "#E8ECF4" }}>
            support@mybossboard.com
          </p>
        </div>
      </div>
    </section>
  );
}
