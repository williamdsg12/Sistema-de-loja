'use client';

import React from 'react';
import Link from 'next/link';
import { Construction, ArrowLeft, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface ModulePlaceholderProps {
  title: string;
  sprint: string;
  description: string;
}

export function ModulePlaceholder({ title, sprint, description }: ModulePlaceholderProps) {
  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
      <Card>
        <CardContent style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '1rem',
              backgroundColor: 'var(--primary-50)',
              color: 'var(--primary-600)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: '1.25rem',
            }}
          >
            <Construction size={40} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            {title}
          </h2>
          <div
            style={{
              display: 'inline-block',
              padding: '0.25rem 0.75rem',
              backgroundColor: 'var(--info-bg)',
              color: 'var(--info-text)',
              fontSize: '0.75rem',
              fontWeight: 600,
              borderRadius: 'var(--radius-full)',
              marginBottom: '1rem',
            }}
          >
            {sprint}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '520px', margin: '0 auto 2rem' }}>
            {description}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <Link href="/dashboard">
              <Button variant="outline" leftIcon={<ArrowLeft size={16} />}>
                Voltar ao Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
