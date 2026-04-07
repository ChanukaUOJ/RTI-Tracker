import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from './Button';

export function Modal({
  open,
  title,
  children,
  onClose,
  footer
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/10 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{title}</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="px-2"
            onClick={onClose}
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-4 md:p-6 max-h-[75vh] overflow-y-auto">
          {children}
        </div>
        {footer && (
          <div className="p-4 border-t border-gray-200 bg-gray-50/30 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

