import LegalPageLayout from '../components/LegalPageLayout';

export default function CommunityGuidelinesPage() {
  const sections = [
    { id: 'respectful-communication', title: '1. Respectful Communication' },
    { id: 'harassment-abuse', title: '2. Harassment & Abuse' },
    { id: 'threats-intimidation', title: '3. Threats & Intimidation' },
    { id: 'sexual-harassment', title: '4. Sexual Conduct & Nudity' },
    { id: 'privacy-sensitive-info', title: '5. Privacy & Sensitive Info' },
    { id: 'spam-malicious-links', title: '6. Spam & Malicious Content' },
    { id: 'impersonation-deception', title: '7. Impersonation & Deception' },
    { id: 'responsible-use', title: '8. Responsible Platform Use' },
    { id: 'reporting-concerns', title: '9. Reporting & Moderation Scope' },
  ];

  return (
    <LegalPageLayout
      title="Community Guidelines"
      badge="Safety & Conduct Standards"
      sections={sections}
      disclaimer="Notice: These Community Guidelines outline our core standards of conduct for Omaglee. In the current release, user reporting and automated moderation systems are in active development."
    >
      <section id="respectful-communication" className="legal-section">
        <h2>1. Respectful Communication</h2>
        <p>
          Omaglee is a global space intended for positive, serendipitous conversations. Every user must approach interactions with basic kindness, courtesy, and respect for differences in culture, nationality, belief, and background.
        </p>
        <p>
          Disagreements and differing viewpoints are a normal part of life, but abusive language, slurs, dehumanizing rhetoric, or discriminatory attacks targeted at race, ethnicity, religion, disability, gender identity, or sexual orientation are strictly unacceptable.
        </p>
      </section>

      <section id="harassment-abuse" className="legal-section">
        <h2>2. Harassment & Abusive Behavior</h2>
        <p>
          We maintain a zero-tolerance stance toward systematic harassment or targeted bullying. Harassment includes, but is not limited to:
        </p>
        <ul>
          <li>Using offensive, insulting, or degrading language intended to demean another participant.</li>
          <li>Targeted taunting or attempting to provoke extreme distress or panic.</li>
          <li>Encouraging others to harass or intimidate a participant.</li>
          <li>Repeatedly reconnecting with the intent of targeting a specific individual.</li>
        </ul>
      </section>

      <section id="threats-intimidation" className="legal-section">
        <h2>3. Threats & Intimidation</h2>
        <p>
          Direct, indirect, or veiled threats of physical violence, terrorism, self-harm, swatting, or legal extortion are grave violations of community safety.
        </p>
        <p>
          Any behavior that causes a reasonable person to fear for their personal safety, or the safety of their family or property, will result in immediate permanent expulsion from the platform once moderation systems are operational, alongside appropriate referrals to law enforcement where required by law.
        </p>
      </section>

      <section id="sexual-harassment" className="legal-section">
        <h2>4. Sexual Conduct & Inappropriate Content</h2>
        <p>
          Omaglee is designed as a conversational video-chat environment. The display of sexually explicit acts, public nudity, non-consensual sexualization, or obscene gestures is strictly prohibited.
        </p>
        <div className="legal-highlight-box">
          <strong>Child Safety Mandate:</strong> The exploitation, depiction, or endangerment of minors is prohibited in the absolute strongest terms. Omaglee cooperates fully with global child protection organizations and legal authorities to address any such violations.
        </div>
      </section>

      <section id="privacy-sensitive-info" className="legal-section">
        <h2>5. Privacy & Sensitive Information (Doxxing)</h2>
        <p>
          Respecting personal boundaries is essential. You must not attempt to extract, publish, or record another user’s personal data.
        </p>
        <ul>
          <li><strong>Do Not Share Personal Data:</strong> Protect your own privacy. Never reveal passwords, bank information, home addresses, or phone numbers.</li>
          <li><strong>No Doxxing:</strong> Broadcasting or attempting to uncover another user's physical location, IP address, employer, or real-world identity is strictly forbidden.</li>
          <li><strong>No Non-Consensual Recording:</strong> Recording conversations without explicit permission undermines the spontaneous trust of random video chat.</li>
        </ul>
      </section>

      <section id="spam-malicious-links" className="legal-section">
        <h2>6. Spam, Advertising & Malicious Content</h2>
        <p>
          Omaglee is a platform for human-to-human interaction, not a billboard or phishing channel. Prohibited commercial behaviors include:
        </p>
        <ul>
          <li>Broadcasting automated video loops, pre-recorded advertisements, or promotional banners.</li>
          <li>Directing users to commercial cam sites, subscription pages, or affiliate funnels.</li>
          <li>Distributing harmful links, malware, spyware, or phishing scams.</li>
        </ul>
      </section>

      <section id="impersonation-deception" className="legal-section">
        <h2>7. Impersonation & Deceptive Behavior</h2>
        <p>
          Do not impersonate other individuals, public figures, organizations, or Omaglee staff members. Broadcasting third-party video footage, deepfakes, or synthetic AI media intended to deceive participants regarding your identity is prohibited.
        </p>
      </section>

      <section id="responsible-use" className="legal-section">
        <h2>8. Responsible Platform Use</h2>
        <p>
          Users must interact with the platform using supported client software. Tampering with video streams, attempting to bypass interface safety controls, manipulating peer connection signaling, or executing denial-of-service attacks against platform servers or other peers is strictly prohibited.
        </p>
      </section>

      <section id="reporting-concerns" className="legal-section">
        <h2>9. Reporting & Moderation Scope</h2>
        <p>
          These guidelines outline our standard expectations for user conduct. In this technical development phase, our centralized backend reporting and automated moderation systems are being prepared for release.
        </p>
        <p>
          <strong>Immediate Self-Protection:</strong> If you encounter any user whose behavior violates these standards, click <strong>Next Stranger</strong> or <strong>Stop</strong> immediately to sever the connection.
        </p>
      </section>
    </LegalPageLayout>
  );
}
