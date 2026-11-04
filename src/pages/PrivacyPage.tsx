import LegalPageLayout from '../components/LegalPageLayout';

export default function PrivacyPage() {
  const sections = [
    { id: 'intro', title: '1. Introduction' },
    { id: 'info-processed', title: '2. Information We May Process' },
    { id: 'media-permissions', title: '3. Camera & Microphone Permissions' },
    { id: 'technical-metadata', title: '4. Technical Data & WebRTC' },
    { id: 'cookies-storage', title: '5. Cookies & Local Storage' },
    { id: 'how-used', title: '6. How Information Is Used' },
    { id: 'data-sharing', title: '7. Data Sharing & Third Parties' },
    { id: 'retention', title: '8. Data Retention' },
    { id: 'security', title: '9. Security Considerations' },
    { id: 'user-choices', title: '10. Your Rights & Choices' },
    { id: 'contact', title: '11. Privacy Contact Placeholder' },
  ];

  return (
    <LegalPageLayout
      title="Privacy Policy"
      badge="Transparency & Data"
      sections={sections}
      disclaimer="Notice: This Privacy Policy is an initial architecture draft prepared for Omaglee. It reflects our intended data architecture and must undergo formal legal compliance review prior to general public commercial deployment."
    >
      <section id="intro" className="legal-section">
        <h2>1. Introduction</h2>
        <p>
          This Privacy Policy describes how Omaglee (&quot;we&quot;, &quot;our&quot;, or &quot;the platform&quot;) handles information when you interact with our website, client interfaces, and video-chat services.
        </p>
        <p>
          We are committed to transparent information practices. Because Omaglee is designed for spontaneous, random video chats without persistent user profiles, our architectural philosophy is to minimize personal data retention while maintaining necessary infrastructure security and service delivery.
        </p>
      </section>

      <section id="info-processed" className="legal-section">
        <h2>2. Information We May Process</h2>
        <p>
          Unlike traditional social networks, Omaglee does not require account creation, passwords, phone numbers, or social media linking to access the public chat interface. We may process:
        </p>
        <ul>
          <li><strong>Ephemeral Media:</strong> Audio and video streams transmitted between peers during active video-chat sessions.</li>
          <li><strong>Technical Identifiers:</strong> IP addresses, browser user-agent strings, device operating systems, and connection timestamps.</li>
          <li><strong>Support Inquiries:</strong> Any email address, name, or message content voluntarily submitted when contacting our team.</li>
        </ul>
      </section>

      <section id="media-permissions" className="legal-section">
        <h2>3. Camera & Microphone Permissions</h2>
        <p>
          To participate in random video chat, your web browser requests explicit hardware permission to access your camera and microphone.
        </p>
        <ul>
          <li>Permissions are controlled directly by your web browser and operating system settings.</li>
          <li>You may revoke or mute camera and microphone access at any time through our on-screen controls or browser security settings.</li>
          <li>Camera permissions are evaluated solely for client hardware readiness and are not transmitted to remote servers without user action.</li>
        </ul>
      </section>

      <section id="technical-metadata" className="legal-section">
        <h2>4. Technical Information & WebRTC Connection Metadata</h2>
        <p>
          Real-time peer-to-peer audio and video communication relies on the WebRTC (Web Real-Time Communication) standard. To establish direct peer connections:
        </p>
        <ul>
          <li>Your browser exchanges Session Description Protocol (SDP) signals containing temporary IP address candidates via signaling servers (STUN/TURN).</li>
          <li>Direct peer-to-peer connections mean audio/video media travels directly between user browsers rather than being recorded or archived on Omaglee centralized servers, unless relayed via TURN infrastructure for restrictive firewalls.</li>
          <li>We do not make guarantees of total anonymity, as network IP exchange is an inherent technical requirement of peer-to-peer internet protocols.</li>
        </ul>
      </section>

      <section id="cookies-storage" className="legal-section">
        <h2>5. Cookies & Local Storage</h2>
        <p>
          Omaglee uses minimal client-side storage (such as browser `localStorage` or session cookies) exclusively for:
        </p>
        <ul>
          <li>Remembering interface preferences (such as audio/video mute states or dark mode settings).</li>
          <li>Managing session state and security tokens to protect against automated abuse.</li>
        </ul>
        <p>We do not sell user data to third-party ad networks or data brokers.</p>
      </section>

      <section id="how-used" className="legal-section">
        <h2>6. How Information Is Used</h2>
        <p>Technical and connection metadata is utilized solely to:</p>
        <ul>
          <li>Facilitate peer matchmaking and establish stable WebRTC connections.</li>
          <li>Maintain platform security, mitigate automated denial-of-service (DoS) attacks, and prevent abuse.</li>
          <li>Diagnose backend server connectivity issues and optimize bandwidth delivery.</li>
        </ul>
      </section>

      <section id="data-sharing" className="legal-section">
        <h2>7. Data Sharing & Third Parties</h2>
        <p>
          We do not monetize, rent, or sell your personal information. Information may only be disclosed under the following narrow circumstances:
        </p>
        <ul>
          <li><strong>Infrastructure Providers:</strong> Cloud hosting (e.g., ServerByt hosting infrastructure) and STUN/TURN signaling relays necessary to transmit packets.</li>
          <li><strong>Legal Obligations:</strong> When strictly required by valid subpoena, court order, or applicable law to protect child safety or investigate severe criminal offenses.</li>
        </ul>
      </section>

      <section id="retention" className="legal-section">
        <h2>8. Data Retention</h2>
        <p>
          Our centralized Laravel backend retains temporary web server access logs for standard diagnostic and security audit periods, after which they are routinely rotated and purged. Audio and video streams are transient and not permanently recorded by Omaglee during standard sessions.
        </p>
      </section>

      <section id="security" className="legal-section">
        <h2>9. Security Considerations</h2>
        <p>
          We implement industry-standard cryptographic protections, including HTTPS (Transport Layer Security) and DTLS-SRTP encryption for WebRTC media streams. While we strive to protect user data, no method of transmission over the internet is completely infallible. Users should exercise personal discretion and never disclose sensitive information to strangers.
        </p>
      </section>

      <section id="user-choices" className="legal-section">
        <h2>10. Your Rights & Choices</h2>
        <p>
          Depending on your jurisdiction, you may have rights regarding access, correction, or deletion of personal data held about you. Because we do not maintain accounts or permanent identity profiles, requests to identify ephemeral connection data must be accompanied by precise technical metadata (e.g., exact IP and UTC timestamp).
        </p>
      </section>

      <section id="contact" className="legal-section">
        <h2>11. Privacy Contact Placeholder</h2>
        <p>
          For privacy inquiries or technical data questions regarding this draft policy, please use our Contact page or direct correspondence to:
        </p>
        <div className="legal-highlight-box">
          <strong>Privacy Compliance Officer (Placeholder):</strong><br />
          Email: <code>[privacy-contact@example-omaglee.com - To be assigned prior to launch]</code><br />
          Postal: <code>[Registered corporate address to be specified upon legal incorporation]</code>
        </div>
      </section>
    </LegalPageLayout>
  );
}
