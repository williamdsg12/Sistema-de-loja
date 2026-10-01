import React, { HTMLAttributes } from 'react';
import styles from './Badge.module.css';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'primary';
  size?: 'sm' | 'md';
}

export function Badge({ children, variant = 'neutral', size = 'md', className = '', ...props }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[variant]} ${styles[size]} ${className}`} {...props}>
      {children}
    </span>
  );
}
