import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  to?: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
  iconPosition?: 'left' | 'right';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
  target?: string;
  rel?: string;
}

export default function Button({
  children,
  to,
  href,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  ariaLabel,
  ...props
}: ButtonProps) {
  const classNames = `btn btn-${variant} btn-${size} ${className} ${disabled ? 'btn-disabled' : ''}`.trim();

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  const content = (
    <>
      {Icon && iconPosition === 'left' && <Icon className="btn-icon" size={iconSize} aria-hidden="true" />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && <Icon className="btn-icon" size={iconSize} aria-hidden="true" />}
    </>
  );

  if (to && !disabled) {
    return (
      <Link to={to} className={classNames} aria-label={ariaLabel}>
        {content}
      </Link>
    );
  }

  if (href && !disabled) {
    return (
      <a href={href} className={classNames} aria-label={ariaLabel} target={props.target} rel={props.rel}>
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={classNames}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      {...props}
    >
      {content}
    </button>
  );
}
