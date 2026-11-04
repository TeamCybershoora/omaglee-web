import { Laptop, ArrowRight } from 'lucide-react';

export interface AdPlacementProps {
  className?: string;
}

export default function AdPlacement({ className = '' }: AdPlacementProps) {
  return (
    <div className={`cyber-ad-card ${className}`} role="complementary" aria-label="Sponsored Announcement">
      <div className="ad-card-badge-wrap">
        <span className="ad-pill-badge">Ad</span>
      </div>

      <div className="ad-card-main">
        <div className="ad-text-content">
          <h4 className="ad-headline">Build Your Tech Career</h4>
          <p className="ad-subtext">Learn Web, App & AI Development</p>
        </div>

        <div className="ad-visual-wrap">
          <div className="ad-laptop-preview">
            <Laptop size={32} className="ad-laptop-icon" />
          </div>
        </div>

        <a
          href="https://cybershoora.com"
          target="_blank"
          rel="noopener noreferrer"
          className="ad-action-btn"
        >
          <span>Join Now</span>
          <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}
