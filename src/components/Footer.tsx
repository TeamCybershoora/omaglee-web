import { Link } from 'react-router-dom';
import { Video, ShieldCheck } from 'lucide-react';
import '../styles/footer.css';

const currentYear = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-col brand-col">
            <Link to="/" className="footer-brand" aria-label="Omaglee Home">
              <div className="footer-logo-icon">
                <Video size={18} aria-hidden="true" />
              </div>
              <span className="footer-brand-title">OMAGLEE</span>
            </Link>
            <p className="footer-tagline">
              Connecting people worldwide through spontaneous random video chat. Built with a focus on respectful, memorable conversations.
            </p>
            <div className="footer-badge">
              <ShieldCheck size={14} className="badge-icon" />
              <span>Community-first design</span>
            </div>
          </div>

          {/* Platform Links */}
          <div className="footer-col">
            <h4 className="footer-heading">Platform</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/chat">Start Chatting</Link></li>
              <li><Link to="/about">About Omaglee</Link></li>
            </ul>
          </div>

          {/* Safety & Guidelines */}
          <div className="footer-col">
            <h4 className="footer-heading">Safety & Rules</h4>
            <ul className="footer-links">
              <li><Link to="/community-guidelines">Community Guidelines</Link></li>
              <li><Link to="/privacy">Safety & Privacy</Link></li>
              <li><Link to="/contact">Report Concerns</Link></li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="footer-col">
            <h4 className="footer-heading">Legal & Help</h4>
            <ul className="footer-links">
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/contact">Contact Support</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom">
          <p className="copyright">
            &copy; {currentYear} Omaglee. All rights reserved.
          </p>
          <p className="footer-meta">
            Designed for genuine online connections.
          </p>
        </div>
      </div>
    </footer>
  );
}
