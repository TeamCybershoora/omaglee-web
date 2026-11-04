import { Video, Sparkles, HeartHandshake, Shield, Globe, ArrowRight } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Button from '../components/Button';
import SectionHeading from '../components/SectionHeading';
import '../styles/pages.css';

export default function AboutPage() {
  return (
    <PageLayout>
      <div className="content-page about-page">
        {/* Hero Header */}
        <header className="page-header">
          <div className="page-header-container">
            <span className="page-category">Platform Overview</span>
            <h1 className="page-title">About Omaglee</h1>
            <p className="page-lead">
              A modern random video-chat platform dedicated to spontaneous, respectful human connections worldwide.
            </p>
          </div>
        </header>

        {/* Story & Philosophy Section */}
        <section className="page-section">
          <div className="section-container grid-two-col">
            <div className="text-col">
              <span className="section-label">The Vision</span>
              <h2 className="section-heading-sm">Reimagining Spontaneous Encounters</h2>
              <p>
                Omaglee was designed around a simple yet powerful premise: the internet is at its best when it connects people who might never otherwise meet.
              </p>
              <p>
                In a digital landscape filled with algorithmic echo chambers, curated profile feeds, and repetitive interactions, Omaglee offers serendipity. With a single click, users can step into a live one-on-one conversation with someone from a different city, country, or cultural background.
              </p>
              <p>
                Whether you want to have a casual chat, practice a language, share an artistic hobby, or simply break up a mundane afternoon, every session presents a fresh canvas.
              </p>
            </div>

            <div className="card-col">
              <div className="highlight-stat-card">
                <Globe size={32} className="stat-card-icon" />
                <h3>Global & Open</h3>
                <p>Designed for open communication across borders, time zones, and life experiences without artificial profile walls.</p>
              </div>
              <div className="highlight-stat-card">
                <HeartHandshake size={32} className="stat-card-icon text-indigo" />
                <h3>Respect as a Core Value</h3>
                <p>Conversations thrive when participants treat each other with courtesy, curiosity, and goodwill.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Intended User Experience */}
        <section className="page-section bg-surface">
          <div className="section-container">
            <SectionHeading
              eyebrow="User Experience"
              title="What to Expect on Omaglee"
              subtitle="We prioritize clarity, speed, and user autonomy at every step."
              align="left"
            />

            <div className="cards-grid-three">
              <div className="info-box">
                <div className="info-box-icon"><Sparkles size={20} /></div>
                <h4>Instant Access</h4>
                <p>Jump directly into the conversation interface without navigating complex onboarding screens or intrusive questionnaires.</p>
              </div>

              <div className="info-box">
                <div className="info-box-icon"><Shield size={20} /></div>
                <h4>Complete Autonomy</h4>
                <p>You control the interaction. If a conversation does not match your vibe or violates community standards, you can move to the next person or end the session instantly.</p>
              </div>

              <div className="info-box">
                <div className="info-box-icon"><Video size={20} /></div>
                <h4>High-Quality Media</h4>
                <p>Engineered for lightweight peer connections that adapt dynamically to different network bandwidths and mobile hardware.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Community & Safety Commitment */}
        <section className="page-section">
          <div className="section-container text-banner-card">
            <div className="banner-content">
              <span className="banner-badge">Our Commitment</span>
              <h2>A Community Grounded in Respect</h2>
              <p>
                Random video chat should never be an excuse for toxicity, harassment, or predatory behavior. While technical matchmaking systems evolve, our behavioral expectations remain unwavering. We expect every participant to treat others with basic human decency.
              </p>
              <div className="banner-actions">
                <Button to="/community-guidelines" variant="secondary" size="md">
                  Read Community Guidelines
                </Button>
                <Button to="/chat" variant="primary" size="md" icon={ArrowRight} iconPosition="right">
                  Start Chatting Now
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
