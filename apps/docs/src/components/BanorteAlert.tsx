import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface BanorteAlertProps {
  type?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: React.ReactNode;
}

export default function BanorteAlert({
  type = 'info',
  title,
  children,
}: BanorteAlertProps) {
  const styles = {
    info: {
      border: '1px solid #ffd1da',
      darkBorder: '1px solid #5c141d',
      bg: '#ffe8ec',
      darkBg: '#2b080c',
      text: '#171717',
      darkText: '#f5f5f5',
      titleColor: '#960014',
      darkTitleColor: '#ffa4b2',
      iconColor: '#ec0029',
      icon: Info,
    },
    success: {
      border: '1px solid #a7f3d0',
      darkBorder: '1px solid #064e3b',
      bg: '#ecfdf5',
      darkBg: '#06261d',
      text: '#065f46',
      darkText: '#a7f3d0',
      titleColor: '#047857',
      darkTitleColor: '#6ee7b7',
      iconColor: '#059669',
      icon: CheckCircle2,
    },
    warning: {
      border: '1px solid #fde68a',
      darkBorder: '1px solid #78350f',
      bg: '#fffbeb',
      darkBg: '#2d1804',
      text: '#92400e',
      darkText: '#fde68a',
      titleColor: '#b45309',
      darkTitleColor: '#fcd34d',
      iconColor: '#d97706',
      icon: AlertTriangle,
    },
    danger: {
      border: '1px solid #fca5a5',
      darkBorder: '1px solid #7f1d1d',
      bg: '#fef2f2',
      darkBg: '#350a0a',
      text: '#991b1b',
      darkText: '#fca5a5',
      titleColor: '#b91c1c',
      darkTitleColor: '#f87171',
      iconColor: '#ec0029',
      icon: AlertCircle,
    },
  }[type];

  const IconComponent = styles.icon;

  return (
    <div
      style={{
        borderRadius: '0.75rem',
        border: styles.border,
        backgroundColor: styles.bg,
        color: styles.text,
        padding: '1rem 1.25rem',
        margin: '1.25rem 0',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <IconComponent
          size={20}
          color={styles.iconColor}
          style={{ flexShrink: 0, marginTop: '0.125rem' }}
        />
        <div style={{ flex: 1, fontSize: '0.9rem', lineHeight: '1.55' }}>
          {title && (
            <div
              style={{
                fontWeight: 700,
                color: styles.titleColor,
                marginBottom: '0.25rem',
                fontSize: '0.95rem',
                letterSpacing: '-0.01em',
              }}
            >
              {title}
            </div>
          )}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
