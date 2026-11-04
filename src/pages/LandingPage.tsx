import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  ArrowRight, 
  Shuffle, 
  Compass, 
  Sliders, 
  ShieldCheck, 
  Smartphone, 
  HeartHandshake, 
  CheckCircle2, 
  Video, 
  Mic, 
  UserCheck, 
  Lock, 
  LogOut, 
  AlertTriangle 
} from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Button from '../components/Button';
import SectionHeading from '../components/SectionHeading';
import FeatureCard from '../components/FeatureCard';
import GoogleAuthModal from '../components/GoogleAuthModal';
import '../styles/landing.css';

interface FeatureItem {
  icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  title: string;
  description: string;
  badge?: string;
}

interface StepItem {
  number: string;
  title: string;
  desc: string;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleStartChatClick = () => {
    const existingUser = localStorage.getItem('omaglee_user');
    if (existingUser) {
      navigate('/chat');
    } else {
      setShowAuthModal(true);
    }
  };
  const features: FeatureItem[] = [
    {
      icon: Shuffle,
      title: 'Random Connections',
      description: 'Discover new conversations without manually browsing profiles or waiting for matches.',
      badge: 'Spontaneous',
    },
    {
      icon: Compass,
      title: 'Simple Experience',
      description: 'A straightforward interface designed to start a conversation with a single click.',
      badge: 'Frictionless',
    },
    {
      icon: Sliders,
      title: 'User Controls',
      description: 'Instant controls to skip, pause, or leave a conversation at any moment you choose.',
      badge: 'Empowerment',
    },
    {
      icon: Lock,
      title: 'Privacy Awareness',
      description: 'No requirement to publicly expose phone numbers or personal social media handles.',
      badge: 'Thoughtful',
    },
    {
      icon: Smartphone,
      title: 'Responsive Design',
      description: 'Crafted for seamless viewing across smartphones, tablets, laptops, and ultra-wide screens.',
      badge: 'Cross-Device',
    },
    {
      icon: HeartHandshake,
      title: 'Community Responsibility',
      description: 'A platform built around clear community standards promoting mutual respect and dignity.',
      badge: 'Respect-First',
    },
  ];

  const steps: StepItem[] = [
    {
      number: '01',
      title: 'Get Ready',
      desc: 'Open the chat portal and prepare your camera and microphone whenever you are ready to talk.',
    },
    {
      number: '02',
      title: 'Start a Conversation',
      desc: 'Click "Start Chatting" to initiate the interactive video interface session.',
    },
    {
      number: '03',
      title: 'Meet Someone New',
      desc: 'Connect serendipitously across cultures and geographies as matchmaking initializes.',
    },
  ];

  return (
    <PageLayout>
      <div className="landing-page">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-glow-blob" aria-hidden="true" />
          <div className="hero-container">
            <div className="hero-content">
              <div className="hero-eyebrow">
                <Sparkles size={14} className="eyebrow-icon" />
                <span>MEET SOMEONE NEW</span>
              </div>

              <h1 className="hero-title">
                One click.<br />
                <span className="hero-highlight">A new connection.</span>
              </h1>

              <p className="hero-description">
                Discover new people and start conversations through random video chat. 
                Every conversation is an opportunity to meet someone new, share a story, or learn a different perspective.
              </p>

              <div className="hero-actions">
                <Button onClick={handleStartChatClick} variant="primary" size="lg" icon={Sparkles} iconPosition="left">
                  Start Chatting
                </Button>
                <Button href="#features" variant="secondary" size="lg" icon={ArrowRight} iconPosition="right">
                  Explore Omaglee
                </Button>
              </div>

              <div className="hero-trust-bar">
                <div className="trust-item">
                  <CheckCircle2 size={16} className="trust-icon" />
                  <span>No account required</span>
                </div>
                <div className="trust-item">
                  <CheckCircle2 size={16} className="trust-icon" />
                  <span>100% Free to use</span>
                </div>
                <div className="trust-item">
                  <CheckCircle2 size={16} className="trust-icon" />
                  <span>Respectful community</span>
                </div>
              </div>
            </div>

            {/* Hero Visual Mockup */}
            <div className="hero-visual" aria-hidden="true">
              <div className="mockup-frame">
                <div className="mockup-topbar">
                  <div className="window-dots">
                    <span className="dot dot-red" />
                    <span className="dot dot-yellow" />
                    <span className="dot dot-green" />
                  </div>
                  <span className="mockup-title">Omaglee Video Portal</span>
                  <div className="status-pill-live">
                    <span className="live-indicator" />
                    <span>Ready</span>
                  </div>
                </div>

                <div className="mockup-video-split">
                  {/* Stranger Mockup */}
                  <div className="mockup-screen stranger-screen">
                    <div className="screen-avatar-glow" />
                    <div className="avatar-placeholder">
                      <UserCheck size={36} />
                    </div>
                    <span className="screen-label">Stranger (Partner)</span>
                    <div className="screen-tag">Serendipitous Match</div>
                  </div>

                  {/* You Mockup */}
                  <div className="mockup-screen user-screen">
                    <div className="avatar-placeholder user-avatar">
                      <Video size={36} />
                    </div>
                    <span className="screen-label">You</span>
                    <div className="screen-controls-preview">
                      <span className="mini-btn"><Mic size={12} /></span>
                      <span className="mini-btn"><Video size={12} /></span>
                    </div>
                  </div>
                </div>

                <div className="mockup-footer">
                  <div className="mockup-btn mockup-btn-next">Next Stranger &rarr;</div>
                  <div className="mockup-btn mockup-btn-stop">Stop</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Introduction Section */}
        <section className="intro-section">
          <div className="intro-container">
            <div className="intro-card">
              <span className="intro-eyebrow">About the Experience</span>
              <h2 className="intro-heading">
                Meet people beyond your usual circle.
              </h2>
              <p className="intro-text">
                In an era of hyper-filtered feeds and curated profiles, Omaglee brings back the excitement of spontaneous, authentic conversation. 
                Whether you want to practice a new language, share a laugh, or simply pass the time chatting with someone continents away, 
                every connection starts with an open mind.
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features-section">
          <div className="features-container">
            <SectionHeading
              eyebrow="Core Highlights"
              title="Built for Spontaneous Conversations"
              subtitle="Every detail in Omaglee is thoughtfully engineered to deliver a seamless, respectful video chat experience."
            />

            <div className="features-grid">
              {features.map((item) => (
                <FeatureCard
                  key={item.title}
                  icon={item.icon}
                  title={item.title}
                  description={item.description}
                  badge={item.badge}
                />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="how-it-works-section">
          <div className="how-it-works-container">
            <SectionHeading
              eyebrow="Step-by-Step"
              title="How Omaglee Works"
              subtitle="Three straightforward steps from opening your browser to striking up a new conversation."
            />

            <div className="steps-grid">
              {steps.map((step) => (
                <div key={step.number} className="step-card">
                  <div className="step-header">
                    <span className="step-number">{step.number}</span>
                    <div className="step-divider" />
                  </div>
                  <h3 className="step-title">{step.title}</h3>
                  <p className="step-desc">{step.desc}</p>
                </div>
              ))}
            </div>

            <div className="phase-note-banner">
              <Sparkles size={16} className="banner-icon" />
              <span>
                <strong>Architecture Note:</strong> Phase 5 establishes live random matchmaking and real-time WebRTC signaling.
              </span>
            </div>
          </div>
        </section>

        {/* Safety & Respect Section */}
        <section className="safety-section">
          <div className="safety-container">
            <div className="safety-card">
              <div className="safety-header">
                <div className="safety-badge">
                  <ShieldCheck size={16} /> Respect & Responsibility
                </div>
                <h2 className="safety-title">
                  Your conversations should begin with respect.
                </h2>
                <p className="safety-subtitle">
                  We believe online spaces should be safe, positive, and considerate. To protect yourself and others:
                </p>
              </div>

              <div className="safety-grid">
                <div className="safety-item">
                  <div className="safety-icon-box">
                    <Lock size={20} />
                  </div>
                  <h4>Protect Personal Info</h4>
                  <p>Never share phone numbers, social media handles, full names, or financial information with strangers.</p>
                </div>

                <div className="safety-item">
                  <div className="safety-icon-box">
                    <HeartHandshake size={20} />
                  </div>
                  <h4>Treat Others with Dignity</h4>
                  <p>Harassment, hatred, bullying, and inappropriate conduct are strictly prohibited across Omaglee.</p>
                </div>

                <div className="safety-item">
                  <div className="safety-icon-box">
                    <LogOut size={20} />
                  </div>
                  <h4>Leave Uncomfortable Chats</h4>
                  <p>You are always in control. If someone makes you uncomfortable, hit "Next" or "Stop" immediately.</p>
                </div>

                <div className="safety-item">
                  <div className="safety-icon-box">
                    <AlertTriangle size={20} />
                  </div>
                  <h4>Clear Community Guidelines</h4>
                  <p>Familiarize yourself with our behavioral standards to help maintain a positive community for all.</p>
                </div>
              </div>

              <div className="safety-actions">
                <Button to="/community-guidelines" variant="secondary" size="md">
                  Read Community Guidelines
                </Button>
                <Button to="/privacy" variant="ghost" size="md">
                  Review Privacy Policy
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Final Call to Action */}
        <section className="cta-section">
          <div className="cta-container">
            <div className="cta-card">
              <span className="cta-eyebrow">Ready to connect?</span>
              <h2 className="cta-title">Your next conversation starts here.</h2>
              <p className="cta-subtitle">
                Step into the video chat portal and meet someone new today. No registrations, no fees.
              </p>
              <div className="cta-actions">
                <Button onClick={handleStartChatClick} variant="primary" size="lg" icon={Sparkles} iconPosition="left">
                  Start Chatting Now
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <GoogleAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          navigate('/chat');
        }}
      />
    </PageLayout>
  );
}
