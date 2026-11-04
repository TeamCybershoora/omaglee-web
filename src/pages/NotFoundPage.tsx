import { Home, AlertCircle } from 'lucide-react';
import PageLayout from '../components/PageLayout';
import Button from '../components/Button';
import '../styles/pages.css';

export default function NotFoundPage() {
  return (
    <PageLayout>
      <div className="content-page" style={{ padding: '6rem 1.5rem', textAlign: 'center', alignItems: 'center' }}>
        <div style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: 'rgba(239, 68, 68, 0.15)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#f87171' 
          }}>
            <AlertCircle size={32} />
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff' }}>Page Not Found</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
            The page you are looking for does not exist or has been moved. You can return safely to the home page or start chatting.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <Button to="/" variant="secondary" size="md" icon={Home} iconPosition="left">
              Return Home
            </Button>
            <Button to="/chat" variant="primary" size="md">
              Start Chatting
            </Button>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
