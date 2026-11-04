import { useState, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Video, Menu, X, Sparkles } from 'lucide-react';
import Button from './Button';
import '../styles/navbar.css';

interface NavLinkItem {
  label: string;
  to: string;
}

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [mobileMenuOpen]);

  const navLinks: NavLinkItem[] = [
    { label: 'Home', to: '/' },
    { label: 'About', to: '/about' },
    { label: 'Community Guidelines', to: '/community-guidelines' },
    { label: 'Safety & Privacy', to: '/privacy' },
    { label: 'Contact', to: '/contact' },
  ];

  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Brand Logo */}
        <Link to="/" className="brand-logo" aria-label="Omaglee Home">
          <div className="logo-icon-wrapper">
            <Video size={20} className="logo-icon" aria-hidden="true" />
          </div>
          <span className="brand-name">
            OMAGLEE
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="desktop-nav" aria-label="Main Navigation">
          <ul className="nav-list">
            {navLinks.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  end={link.to === '/'}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Desktop CTA */}
        <div className="header-actions">
          <Button to="/chat" variant="primary" size="md" icon={Sparkles} iconPosition="left">
            Start Chatting
          </Button>
          
          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu-drawer" onClick={(e) => e.stopPropagation()}>
            <nav aria-label="Mobile Navigation">
              <ul className="mobile-nav-list">
                {navLinks.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      onClick={closeMobileMenu}
                      className={({ isActive }) => `mobile-nav-link ${isActive ? 'active' : ''}`}
                      end={link.to === '/'}
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="mobile-menu-cta">
              <Button to="/chat" onClick={closeMobileMenu} variant="primary" size="lg" className="w-full" icon={Sparkles}>
                Start Chatting
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
