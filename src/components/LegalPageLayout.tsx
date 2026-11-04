import React from 'react';
import { AlertCircle, Calendar, Shield } from 'lucide-react';
import PageLayout from './PageLayout';
import '../styles/legal.css';

export interface LegalSection {
  id: string;
  title: string;
}

export interface LegalPageLayoutProps {
  title: string;
  lastUpdated?: string;
  badge?: string;
  disclaimer?: string;
  sections?: LegalSection[];
  children: React.ReactNode;
}

export default function LegalPageLayout({
  title,
  lastUpdated = 'October 2026',
  badge = 'Policy & Standards',
  disclaimer = 'Notice: This document is an initial draft prepared for the Omaglee Phase 2 technical foundation. It requires formal legal and regulatory review prior to public commercial launch.',
  sections = [],
  children,
}: LegalPageLayoutProps) {
  return (
    <PageLayout>
      <div className="legal-container">
        {/* Header */}
        <header className="legal-header">
          <div className="legal-badge">
            <Shield size={14} />
            <span>{badge}</span>
          </div>
          <h1 className="legal-title">{title}</h1>
          <div className="legal-meta">
            <span className="meta-item">
              <Calendar size={14} /> Last Updated: {lastUpdated}
            </span>
            <span className="meta-item">Status: Phase 2 Draft</span>
          </div>

          {disclaimer && (
            <div className="legal-disclaimer">
              <AlertCircle size={18} className="disclaimer-icon" />
              <p>{disclaimer}</p>
            </div>
          )}
        </header>

        {/* Layout Grid */}
        <div className="legal-layout-grid">
          {sections.length > 0 && (
            <aside className="legal-toc">
              <div className="toc-card">
                <h3 className="toc-title">Table of Contents</h3>
                <nav className="toc-nav" aria-label="Policy sections">
                  <ul>
                    {sections.map((sec) => (
                      <li key={sec.id}>
                        <a href={`#${sec.id}`} className="toc-link">
                          {sec.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </aside>
          )}

          <div className="legal-content-body">
            {children}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
