import React from 'react';
import '../styles/feature-card.css';

export interface FeatureCardProps {
  icon?: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  title: string;
  description: string;
  badge?: string;
  className?: string;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  badge,
  className = '',
}: FeatureCardProps) {
  return (
    <div className={`feature-card ${className}`}>
      <div className="feature-card-header">
        {Icon && (
          <div className="feature-icon-wrapper">
            <Icon size={22} className="feature-icon" aria-hidden="true" />
          </div>
        )}
        {badge && <span className="feature-badge">{badge}</span>}
      </div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-description">{description}</p>
    </div>
  );
}
