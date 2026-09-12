import React from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  Building2,
  Star,
  Plus,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Account, AccountPerformance, AccountStatsTotal } from './types';
import { AccountContextMenu } from './AccountContextMenu';

interface AccountsSectionProps {
  accounts: Account[];
  accountStatsMap: Map<string, AccountPerformance>;
  totalStats: AccountStatsTotal;
  isAccountsLoading: boolean;
  onOpenAddAccount: () => void;
  onOpenEditAccount: (acc: Account) => void;
  onDeleteAccount: (acc: Account) => void;
  onSetDefaultAccount: (accId: string) => void;
}

export function AccountsSection({
  accounts,
  accountStatsMap,
  totalStats,
  isAccountsLoading,
  onOpenAddAccount,
  onOpenEditAccount,
  onDeleteAccount,
  onSetDefaultAccount,
}: AccountsSectionProps) {
  const totalBalance = totalStats.currentBalance;
  const personalCount = accounts.filter((a) => a.scope === 'personal').length;
  const propCount = accounts.filter((a) => a.scope === 'prop').length;

  return (
    <div className="space-y-6">
      {/* Metric Cards (L2 Compact) with Item-stagger per design.md §3.1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: 0, ease: [0.16, 1, 0.3, 1] }}
          className="bg-canvas border border-border-card rounded-[18px] p-3.5 sm:p-4 flex flex-col justify-between"
        >
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted truncate">
            Total
          </span>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-text-main mt-1">
            {accounts.length}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: 0.03, ease: [0.16, 1, 0.3, 1] }}
          className="bg-canvas border border-border-card rounded-[18px] p-3.5 sm:p-4 flex flex-col justify-between"
        >
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted truncate">
            Balance
          </span>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-emerald-500 mt-1">
            ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="bg-canvas border border-border-card rounded-[18px] p-3.5 sm:p-4 flex flex-col justify-between"
        >
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted truncate">
            Personal
          </span>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-blue-500 mt-1">
            {personalCount}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, delay: 0.09, ease: [0.16, 1, 0.3, 1] }}
          className="bg-canvas border border-border-card rounded-[18px] p-3.5 sm:p-4 flex flex-col justify-between"
        >
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted truncate">
            Prop Firm
          </span>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-amber-500 mt-1">
            {propCount}
          </div>
        </motion.div>
      </div>

      {/* Account List */}
      {isAccountsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-36 rounded-[26px] bg-canvas border border-border-card animate-pulse p-4"
            />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="py-12 px-4 text-center rounded-[26px] bg-card border border-border-card flex flex-col items-center justify-center shadow-xs"
        >
          <div className="w-12 h-12 rounded-full bg-canvas border border-border-card flex items-center justify-center text-text-muted mb-3">
            <Wallet size={24} />
          </div>
          <p className="text-sm font-semibold text-text-main">
            No trading accounts yet
          </p>
          <p className="text-xs text-text-muted mt-1 max-w-xs">
            Add your personal broker accounts or prop firm challenges to track performance.
          </p>
          <button
            type="button"
            onClick={onOpenAddAccount}
            className="mt-4 h-10 px-5 flex items-center gap-2 bg-blue-500 border border-blue-500 text-white rounded-full font-semibold text-xs hover:bg-blue-600 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Plus size={15} />
            <span>Add first account</span>
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {accounts.map((acc, index) => {
            const stats = accountStatsMap.get(acc.id);
            const currentBal = stats ? stats.currentBalance : (acc.current_balance ?? acc.balance);
            const netPnL = stats ? stats.netPnL : 0;
            const netPnLPct = stats ? stats.netPnLPct : 0;
            const tradesCount = stats ? stats.tradesCount : 0;

            return (
              <motion.div
                key={acc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.18,
                  delay: Math.min(index * 0.03, 0.24),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="bg-card border border-border-card rounded-[26px] p-4 sm:p-5 flex flex-col justify-between transition-all hover:border-blue-500/40 shadow-xs group"
              >
                {/* Header (2:1 Widget Style): Icon, Name, Scope Badge & Actions */}
                <div className="flex items-center justify-between gap-3 w-full pb-3.5 border-b border-border-card/60">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0",
                        acc.scope === 'personal'
                          ? "bg-blue-500/10 border border-blue-500/20 text-blue-500"
                          : "bg-amber-500/10 border border-amber-500/20 text-amber-500"
                      )}
                    >
                      {acc.scope === 'personal' ? (
                        <Wallet size={16} />
                      ) : (
                        <Building2 size={16} />
                      )}
                    </div>

                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-bold tracking-tight text-text-main truncate">
                        {acc.name}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[0.6875rem] font-bold uppercase shrink-0",
                          acc.scope === 'personal'
                            ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                            : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        )}
                      >
                        {acc.scope === 'prop'
                          ? acc.prop_mode === 'live'
                            ? 'Funded'
                            : 'Challenge'
                          : 'Personal'}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Default Star Toggle + Context Menu */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      title={acc.is_default ? "Default account (click to unset)" : "Set as default account"}
                      aria-label={acc.is_default ? `Unset ${acc.name} as default account` : `Set ${acc.name} as default account`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetDefaultAccount(acc.id);
                      }}
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shadow-xs transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95",
                        acc.is_default
                          ? "bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20"
                          : "bg-canvas border border-border-card text-text-muted hover:text-amber-400 hover:bg-card"
                      )}
                    >
                      <Star size={14} className={acc.is_default ? "fill-amber-500" : ""} />
                    </button>

                    <AccountContextMenu
                      accountName={acc.name}
                      onEdit={() => onOpenEditAccount(acc)}
                      onDelete={() => onDeleteAccount(acc)}
                    />
                  </div>
                </div>

                {/* Content: 2:1 Widget Style (Label -> Primary Value -> Supporting) */}
                <div className="pt-3.5 flex items-end justify-between gap-4 w-full">
                  {/* Left Column: Current Balance & Trades Count */}
                  <div className="flex flex-col min-w-0">
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted">
                      Current Balance
                    </span>
                    <div className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-text-main mt-0.5 flex items-baseline gap-2 truncate">
                      <span>
                        ${currentBal.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-xs font-normal text-text-muted font-sans uppercase">
                        {acc.currency}
                      </span>
                    </div>
                    <span className="text-[0.6875rem] font-mono tabular-nums text-text-muted mt-1">
                      {tradesCount > 0 ? (
                        <span>{tradesCount} {tradesCount === 1 ? 'trade' : 'trades'}</span>
                      ) : (
                        <span className="text-text-muted/60">0 trades</span>
                      )}
                    </span>
                  </div>

                  {/* Right Column: Net P&L Amount & PnL Percentage */}
                  <div className="flex flex-col items-end shrink-0 text-right">
                    <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-muted text-right">
                      Net P&L
                    </span>
                    <div
                      className={cn(
                        "text-xl sm:text-2xl font-bold font-mono tabular-nums leading-tight mt-0.5",
                        netPnL > 0
                          ? "text-emerald-500"
                          : netPnL < 0
                          ? "text-rose-500"
                          : "text-text-muted"
                      )}
                    >
                      {netPnL > 0
                        ? `+$${netPnL.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : netPnL < 0
                        ? `-$${Math.abs(netPnL).toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : `$0.00`}
                    </div>
                    <span
                      className={cn(
                        "text-[0.6875rem] font-mono tabular-nums mt-1",
                        netPnLPct > 0
                          ? "text-emerald-500 font-semibold"
                          : netPnLPct < 0
                          ? "text-rose-500 font-semibold"
                          : "text-text-muted/60"
                      )}
                    >
                      {netPnLPct > 0 ? `+${netPnLPct.toFixed(1)}%` : `${netPnLPct.toFixed(1)}%`}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
