import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2, Info, ShieldCheck } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Button from '../components/Button';
import '../styles/pages.css';

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  message?: string;
}

export default function ContactPage() {
  const [formData, setFormData] = useState<FormState>({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const validate = (): boolean => {
    const errs: FormErrors = {};
    if (!formData.name.trim()) {
      errs.name = 'Please provide your name or nickname.';
    }
    if (!formData.email.trim()) {
      errs.email = 'Please provide your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please provide a valid email format (e.g. name@example.com).';
    }
    if (!formData.message.trim()) {
      errs.message = 'Please enter a message.';
    } else if (formData.message.trim().length < 15) {
      errs.message = 'Please provide at least 15 characters of detail.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      subject: 'General Inquiry',
      message: '',
    });
    setErrors({});
    setSubmitted(false);
  };

  return (
    <PageLayout>
      <div className="content-page contact-page">
        <header className="page-header">
          <div className="page-header-container">
            <span className="page-category">Help & Communication</span>
            <h1 className="page-title">Contact & Support</h1>
            <p className="page-lead">
              Have a question about the platform, safety inquiries, or technical feedback? Reach out to us.
            </p>
          </div>
        </header>

        <section className="page-section">
          <div className="section-container contact-grid">
            {/* Contact Form Card */}
            <div className="contact-card">
              <div className="contact-card-header">
                <MessageSquare className="card-header-icon" size={22} />
                <div>
                  <h3>Send Us a Message</h3>
                  <p>Our support form includes full client-side validation.</p>
                </div>
              </div>

              {submitted ? (
                <div className="contact-success-state">
                  <div className="success-icon-wrapper">
                    <CheckCircle2 size={44} className="text-emerald" />
                  </div>
                  <h3>Validation Successful</h3>
                  <p>
                    Thank you, <strong>{formData.name}</strong>. Your message passed all client-side validation checks.
                  </p>
                  
                  <div className="architecture-notice-box">
                    <Info size={18} className="notice-icon" />
                    <div>
                      <strong>Backend Integration Notice:</strong>
                      <p>
                        In this foundation, the centralized Laravel mailer and ticket ingestion endpoint are not yet connected to a remote SMTP service. Your message is not sent to a live inbox.
                      </p>
                    </div>
                  </div>

                  <Button variant="secondary" size="md" onClick={handleReset}>
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form className="contact-form" onSubmit={handleSubmit} noValidate>
                  {/* Name */}
                  <div className="form-group">
                    <label htmlFor="contact-name" className="form-label">
                      Your Name <span className="required">*</span>
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      className={`form-input ${errors.name ? 'input-error' : ''}`}
                      placeholder="e.g. Alex"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      aria-invalid={!!errors.name}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                    />
                    {errors.name && <span id="name-error" className="error-text">{errors.name}</span>}
                  </div>

                  {/* Email */}
                  <div className="form-group">
                    <label htmlFor="contact-email" className="form-label">
                      Email Address <span className="required">*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      className={`form-input ${errors.email ? 'input-error' : ''}`}
                      placeholder="alex@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                    />
                    {errors.email && <span id="email-error" className="error-text">{errors.email}</span>}
                  </div>

                  {/* Subject */}
                  <div className="form-group">
                    <label htmlFor="contact-subject" className="form-label">
                      Subject
                    </label>
                    <select
                      id="contact-subject"
                      className="form-input form-select"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Safety & Moderation">Safety & Moderation</option>
                      <option value="Bug / Technical Feedback">Bug / Technical Feedback</option>
                      <option value="Privacy Concern">Privacy Concern</option>
                    </select>
                  </div>

                  {/* Message */}
                  <div className="form-group">
                    <label htmlFor="contact-message" className="form-label">
                      Message <span className="required">*</span>
                    </label>
                    <textarea
                      id="contact-message"
                      rows={5}
                      className={`form-input form-textarea ${errors.message ? 'input-error' : ''}`}
                      placeholder="How can we assist you?"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      aria-invalid={!!errors.message}
                      aria-describedby={errors.message ? 'message-error' : undefined}
                    />
                    {errors.message && <span id="message-error" className="error-text">{errors.message}</span>}
                  </div>

                  <div className="form-disclaimer">
                    <Info size={14} />
                    <span>Submissions will connect to the Laravel backend support ticketing API in upcoming releases.</span>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    icon={Send}
                    iconPosition="right"
                    disabled={submitting}
                  >
                    {submitting ? 'Validating...' : 'Submit Message'}
                  </Button>
                </form>
              )}
            </div>

            {/* Sidebar Information */}
            <div className="contact-sidebar">
              <div className="sidebar-card">
                <div className="sidebar-card-icon">
                  <ShieldCheck size={24} />
                </div>
                <h4>Emergency Notice</h4>
                <p>
                  Omaglee is a self-directed online video chat platform. If you or someone you know is in immediate physical danger, please contact your local law enforcement or national emergency helpline directly.
                </p>
              </div>

              <div className="sidebar-card">
                <div className="sidebar-card-icon text-indigo">
                  <Mail size={24} />
                </div>
                <h4>Support Email Placeholder</h4>
                <p>
                  Direct email support will be activated upon production domain provisioning:
                </p>
                <code className="placeholder-code">[support@your-domain.com]</code>
              </div>

              <div className="sidebar-card">
                <h4>Helpful Resources</h4>
                <ul className="sidebar-links-list">
                  <li><a href="/community-guidelines">Read Community Standards &rarr;</a></li>
                  <li><a href="/privacy">Read Privacy Policy &rarr;</a></li>
                  <li><a href="/terms">Review Terms of Service &rarr;</a></li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
