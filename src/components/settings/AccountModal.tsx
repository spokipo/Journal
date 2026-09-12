import React, { useRef } from 'react';
import { Wallet, X, Check, Loader2 } from 'lucide-react';
import { ModalShell } from '../ui/ModalShell';
import { Select } from '../ui/Select';
import { Switch } from '../ui/Switch';
import { cn } from '../../lib/utils';
import type { Account, AccountFormState } from './types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingAccount: Account | null;
  accountForm: AccountFormState;
  setAccountForm: React.Dispatch<React.SetStateAction<AccountFormState>>;
  onSave: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function AccountModal({
  isOpen,
  onClose,
  editingAccount,
  accountForm,
  setAccountForm,
  onSave,
  isSubmitting,
}: AccountModalProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (formRef.current) {
      if (!formRef.current.checkValidity()) {
        formRef.current.reportValidity();
        return;
      }
    }
    onSave(e || ({ preventDefault: () => {} } as unknown as React.FormEvent));
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={editingAccount ? 'Edit Trading Account' : 'New Trading Account'}
      mobileTitle={editingAccount ? 'Edit Account' : 'New Account'}
      desktopIcon={<Wallet size={20} />}
      desktopIconClass="bg-blue-500/10 text-blue-500"
      size="md"
      onSubmit={handleSubmit}
      mobileLeftAction={{
        icon: <X size={18} />,
        onClick: onClose,
        ariaLabel: editingAccount ? 'Cancel editing' : 'Close modal',
      }}
      mobileRightAction={{
        icon: isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />,
        onClick: handleSubmit,
        ariaLabel: editingAccount ? 'Save changes' : 'Create account',
        isPrimary: true,
        disabled: isSubmitting || !accountForm.name.trim(),
      }}
      desktopFooterRight={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-full bg-card border border-border-card text-sm font-medium text-text-muted hover:text-text-main hover:bg-canvas active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !accountForm.name.trim()}
            className="h-10 px-5 rounded-full bg-blue-500 border border-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin shrink-0" />}
            <span>{editingAccount ? 'Save Changes' : 'Create Account'}</span>
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Account Name */}
        <div className="space-y-2">
          <label
            htmlFor="modal-account-name"
            className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted"
          >
            Account Name
          </label>
          <input
            id="modal-account-name"
            type="text"
            value={accountForm.name}
            onChange={(e) =>
              setAccountForm({ ...accountForm, name: e.target.value })
            }
            className="w-full h-11 bg-card md:bg-canvas border border-border-card rounded-[18px] px-4 text-sm text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-xs"
            placeholder="e.g. FTMO 100k Live"
            required
            autoFocus
          />
        </div>

        {/* Account Scope & Prop Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
              Account Scope
            </label>
            <Select
              size="md"
              value={accountForm.scope}
              onChange={(v) =>
                setAccountForm({
                  ...accountForm,
                  scope: v as 'personal' | 'prop',
                })
              }
              options={[
                { value: 'personal', label: 'Personal Broker' },
                { value: 'prop', label: 'Prop Firm' },
              ]}
              className="w-full"
            />
          </div>

          {accountForm.scope === 'prop' ? (
            <div className="space-y-2">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                Prop Mode
              </label>
              <Select
                size="md"
                value={accountForm.prop_mode || 'challenge'}
                onChange={(v) =>
                  setAccountForm({
                    ...accountForm,
                    prop_mode: v as 'live' | 'challenge',
                  })
                }
                options={[
                  { value: 'challenge', label: 'Challenge / Evaluation' },
                  { value: 'live', label: 'Funded / Live' },
                ]}
                className="w-full"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                Currency
              </label>
              <Select
                size="md"
                value={accountForm.currency}
                onChange={(v) => setAccountForm({ ...accountForm, currency: v })}
                options={[
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'GBP', label: 'GBP (£)' },
                  { value: 'JPY', label: 'JPY (¥)' },
                ]}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Currency & Balance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {accountForm.scope === 'prop' && (
            <div className="space-y-2">
              <label className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                Currency
              </label>
              <Select
                size="md"
                value={accountForm.currency}
                onChange={(v) => setAccountForm({ ...accountForm, currency: v })}
                options={[
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'GBP', label: 'GBP (£)' },
                  { value: 'JPY', label: 'JPY (¥)' },
                ]}
                className="w-full"
              />
            </div>
          )}

          <div className={cn("space-y-2", accountForm.scope !== 'prop' && "sm:col-span-2")}>
            <label
              htmlFor="modal-account-balance"
              className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted"
            >
              Initial / Starting Capital
            </label>
            <input
              id="modal-account-balance"
              type="number"
              step="any"
              min="0"
              value={accountForm.balance}
              onChange={(e) =>
                setAccountForm({
                  ...accountForm,
                  balance: e.target.value,
                })
              }
              className="w-full h-11 bg-card md:bg-canvas border border-border-card rounded-[18px] px-4 text-sm font-mono tabular-nums text-text-main outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all shadow-xs"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Default Account Switch */}
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            if ((e.target as HTMLElement).closest('button[role="switch"]')) return;
            setAccountForm((prev) => ({ ...prev, is_default: !prev.is_default }));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setAccountForm((prev) => ({ ...prev, is_default: !prev.is_default }));
            }
          }}
          className="flex items-center justify-between p-3.5 rounded-[18px] bg-card md:bg-canvas border border-border-card cursor-pointer select-none hover:border-blue-500/30 transition-colors shadow-xs"
        >
          <div>
            <div className="text-xs font-semibold text-text-main">
              Default Account
            </div>
            <div className="text-[0.6875rem] text-text-muted mt-0.5">
              Automatically selected when creating new trades in the journal
            </div>
          </div>
          <Switch
            checked={accountForm.is_default}
            onChange={(checked) =>
              setAccountForm({ ...accountForm, is_default: checked })
            }
            aria-label="Set as default account"
          />
        </div>
      </div>
    </ModalShell>
  );
}
