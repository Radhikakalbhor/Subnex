import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

export function CopyConfirm({
  valueToCopy,
  label = null,
  copyText = 'Copy',
  copiedText = 'Copied!',
  className,
  size = 'sm',
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!valueToCopy) return;
    try {
      await navigator.clipboard.writeText(valueToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.warn('Copy failed', err);
    }
  };

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-200 select-none',
        copied
          ? 'bg-emerald-500/[0.1] text-emerald-700 border border-emerald-500/25'
          : 'bg-[#F5F6F8] hover:bg-neutral-200/70 text-neutral-600 hover:text-neutral-900 border border-black/[0.04]',
        className
      )}
      title={`Copy "${valueToCopy}" to clipboard`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="flex items-center text-emerald-600"
          >
            <Check className="w-3 h-3" strokeWidth={2.5} />
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="flex items-center text-neutral-400 group-hover:text-neutral-700"
          >
            <Copy className="w-3 h-3" strokeWidth={1.75} />
          </motion.span>
        )}
      </AnimatePresence>

      <span>{copied ? copiedText : (label || copyText)}</span>
    </motion.button>
  );
}

