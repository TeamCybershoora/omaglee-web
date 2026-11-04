import LegalPageLayout from '../components/LegalPageLayout';

export default function TermsPage() {
  const sections = [
    { id: 'acceptance', title: '1. Acceptance of Terms' },
    { id: 'eligibility', title: '2. Eligibility & Age Requirements' },
    { id: 'acceptable-use', title: '3. Acceptable Use' },
    { id: 'prohibited-conduct', title: '4. Prohibited Conduct' },
    { id: 'user-responsibility', title: '5. User Responsibility & Disclaimers' },
    { id: 'platform-availability', title: '6. Service Availability & Changes' },
    { id: 'moderation-enforcement', title: '7. Moderation & Termination' },
    { id: 'limitation-liability', title: '8. Limitation of Liability' },
    { id: 'modifications', title: '9. Amendments to Terms' },
    { id: 'contact', title: '10. Legal Contact Placeholder' },
  ];

  return (
    <LegalPageLayout
      title="Terms of Service"
      badge="Legal Agreement"
      sections={sections}
      disclaimer="Notice: This Terms of Service agreement is an initial architecture draft prepared for Omaglee. Prior to general public launch, this text must be reviewed and customized by qualified legal counsel in your operating jurisdiction."
    >
      <section id="acceptance" className="legal-section">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using the Omaglee website, interfaces, or video-chat services, you agree to be bound by these Terms of Service and our Community Guidelines. If you do not agree to all terms and conditions set forth herein, you must immediately discontinue use of the platform.
        </p>
      </section>

      <section id="eligibility" className="legal-section">
        <h2>2. Eligibility & Age Requirements</h2>
        <p>
          You must be at least 18 years of age (or the age of legal majority in your country of residence) to use Omaglee. Minors under the age of 18 are strictly prohibited from using the video chat service.
        </p>
        <p>
          By clicking &quot;Start Chatting&quot; or using the service, you affirmatively represent and warrant that you meet this age requirement and have the legal capacity to enter into a binding agreement.
        </p>
      </section>

      <section id="acceptable-use" className="legal-section">
        <h2>3. Acceptable Use</h2>
        <p>
          Omaglee provides a public communication platform for personal, non-commercial entertainment and social interaction. You agree to use the service in good faith and in full compliance with all applicable local, national, and international laws and regulations.
        </p>
      </section>

      <section id="prohibited-conduct" className="legal-section">
        <h2>4. Prohibited Conduct</h2>
        <p>You strictly agree NOT to:</p>
        <ul>
          <li>Broadcast, display, or promote sexually explicit conduct, pornography, or extreme violence.</li>
          <li>Transmit hate speech, threats, harassment, intimidation, or defamatory material.</li>
          <li>Target, endanger, or solicit any minor in any manner whatsoever.</li>
          <li>Broadcast pre-recorded commercial advertisements, spam, or promotional campaigns.</li>
          <li>Record, screenshot, or distribute another participant&apos;s audio or video feed without their explicit, prior consent.</li>
          <li>Interfere with, circumvent, or compromise the technical infrastructure, signaling servers, or network security of Omaglee.</li>
        </ul>
      </section>

      <section id="user-responsibility" className="legal-section">
        <h2>5. User Responsibility & Disclaimers</h2>
        <p>
          You acknowledge that random video chat inherently connects you with unvetted strangers across the internet. While Omaglee establishes guidelines to encourage respect, we cannot control and are not responsible for the real-time conduct, statements, or visual broadcasts of independent users.
        </p>
        <div className="legal-highlight-box">
          <strong>Caution:</strong> You assume all risks associated with communicating with strangers online. Never disclose personal, financial, physical location, or contact information to participants.
        </div>
      </section>

      <section id="platform-availability" className="legal-section">
        <h2>6. Service Availability & Changes</h2>
        <p>
          The service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind, either express or implied. We do not guarantee uninterrupted, bug-free, or error-free uptime, and reserve the right to suspend, modify, or terminate any component of the service at our sole discretion.
        </p>
      </section>

      <section id="moderation-enforcement" className="legal-section">
        <h2>7. Moderation & Termination</h2>
        <p>
          We reserve the right (though assume no ongoing obligation) to monitor, restrict, or permanently block access to any IP address, device, or user who violates these Terms or our Community Guidelines once our moderation infrastructure is activated.
        </p>
      </section>

      <section id="limitation-liability" className="legal-section">
        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by applicable law, Omaglee, its operators, contributors, and hosting providers shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of or inability to use the platform.
        </p>
      </section>

      <section id="modifications" className="legal-section">
        <h2>9. Amendments to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. When changes occur, the updated policy will be posted with an amended &quot;Last Updated&quot; date. Continued use of the platform after updates constitutes acceptance of the modified Terms.
        </p>
      </section>

      <section id="contact" className="legal-section">
        <h2>10. Legal Contact Placeholder</h2>
        <p>
          Legal notices, DMCA inquiries, or questions regarding these terms should be addressed to our legal representative:
        </p>
        <div className="legal-highlight-box">
          <strong>Legal Department (Placeholder):</strong><br />
          Email: <code>[legal-terms@example-omaglee.com - To be assigned prior to launch]</code><br />
          Governing Law / Jurisdiction: <code>[Jurisdiction to be designated by the operating entity]</code>
        </div>
      </section>
    </LegalPageLayout>
  );
}
