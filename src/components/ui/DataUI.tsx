import React from 'react';
import { X, Inbox } from 'lucide-react';

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200 dark:border-zinc-800">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[#111111] dark:text-zinc-100">{title}</h1>
      {subtitle && <p className="text-sm text-[#52525B] dark:text-zinc-400 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
  </div>
);

export const StatCard: React.FC<{
  label: string;
  value: string | number;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'default' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'navy' | 'mint' | 'dark';
  onClick?: () => void;
}> = ({ label, value, hint, icon: Icon, tone = 'default', onClick }) => {
  const isHeroBlack = tone === 'navy' || tone === 'indigo';
  const isDarkGrey = tone === 'emerald' || tone === 'mint' || tone === 'dark';

  const containerStyle = isHeroBlack
    ? 'bg-[#111111] dark:bg-zinc-900 border-[#111111] dark:border-zinc-700 text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.2)]'
    : isDarkGrey
    ? 'bg-[#27272A] dark:bg-zinc-800 border-[#27272A] dark:border-zinc-700 text-white shadow-[0_6px_18px_-6px_rgba(0,0,0,0.16)]'
    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-[#111111] dark:text-zinc-100 shadow-[0_2px_14px_-4px_rgba(0,0,0,0.06)]';

  const iconStyle = isHeroBlack
    ? 'bg-[#27272A] text-white'
    : isDarkGrey
    ? 'bg-[#3F3F46] text-white'
    : 'bg-zinc-100 dark:bg-zinc-800 text-[#111111] dark:text-zinc-200';

  const labelStyle = isHeroBlack || isDarkGrey
    ? 'text-zinc-300'
    : 'text-[#52525B] dark:text-zinc-400';

  const hintStyle = isHeroBlack || isDarkGrey
    ? 'text-zinc-400'
    : 'text-[#71717A] dark:text-zinc-400';

  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`text-left w-full border rounded-3xl p-5 transition-all ${containerStyle} ${
        onClick ? 'hover:border-[#111111] dark:hover:border-zinc-500 cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-medium ${labelStyle}`}>{label}</p>
          <p className="text-2xl font-bold mt-1.5 tabular-nums font-mono truncate">{value}</p>
          {hint && <p className={`text-xs mt-1 ${hintStyle}`}>{hint}</p>}
        </div>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconStyle}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Tag>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon: Icon = Inbox, title, description, action }) => (
  <div className="bg-white dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-3xl py-12 px-6 text-center">
    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-[#27272A] dark:text-zinc-300 flex items-center justify-center mx-auto mb-3">
      <Icon className="w-5 h-5" />
    </div>
    <h3 className="text-sm font-semibold text-[#111111] dark:text-zinc-100">{title}</h3>
    <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-1 max-w-sm mx-auto">{description}</p>
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, subtitle, maxWidth = 'max-w-xl', children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-xs">
      <div className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full ${maxWidth} max-h-[90vh] flex flex-col shadow-2xl`}>
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h3 className="text-base font-semibold text-[#111111] dark:text-zinc-100">{title}</h3>
            {subtitle && <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-[#111111] dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const SegmentedTabs: React.FC<{
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-x-auto">
    {tabs.map(tab => (
      <button
        key={tab.id}
        type="button"
        onClick={() => onChange(tab.id)}
        className={`px-3.5 py-2 text-xs font-medium rounded-xl whitespace-nowrap shrink-0 transition-colors ${
          active === tab.id
            ? 'bg-[#111111] dark:bg-white text-white dark:text-zinc-950 shadow-xs font-semibold'
            : 'text-[#52525B] dark:text-zinc-400 hover:text-[#111111] dark:hover:text-zinc-100'
        }`}
      >
        {tab.label}
        {typeof tab.count === 'number' && (
          <span className={`ml-1.5 font-mono text-[11px] tabular-nums ${
            active === tab.id ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400 dark:text-zinc-500'
          }`}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

export const StatusText: React.FC<{
  status: string;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}> = ({ status, tone }) => {
  const inferred = tone || (() => {
    const s = (status || '').toLowerCase();
    if (['active', 'paid', 'approved', 'enrolled', 'present', 'pass', 'issued', 'completed', 'offered', 'resolved', 'published', 'results_published', 'eligible', 'admit_ready', 'fulfilled', 'confirmed', 'registered'].includes(s)) return 'success';
    if (['pending', 'under_review', 'shortlisted', 'partial', 'late', 'in_progress', 'requested', 'scheduled', 'ongoing', 'interview', 'draft', 'pending_approval', 'waitlisted', 'reserved', 'needs_grading'].includes(s)) return 'warning';
    if (['rejected', 'overdue', 'absent', 'fail', 'unpaid', 'suspended', 'cancelled', 'major', 'shortage', 'hold', 'dropped'].includes(s)) return 'danger';
    if (['applied', 'open', 'submitted'].includes(s)) return 'info';
    return 'neutral';
  })();

  const colorMap = {
    success: 'text-[#111111] dark:text-zinc-100',
    warning: 'text-[#3F3F46] dark:text-zinc-300',
    danger: 'text-rose-700 dark:text-rose-400',
    info: 'text-[#27272A] dark:text-zinc-200',
    neutral: 'text-[#52525B] dark:text-zinc-400'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold capitalize ${colorMap[inferred]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
};
