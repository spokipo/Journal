import React from 'react';
import { ModalShell, type ModalShellProps, type MobileHeaderAction } from '../ui/ModalShell';

export type { MobileHeaderAction };

export interface TradeModalShellProps extends ModalShellProps {}

/**
 * Обертка над каноническим ModalShell для обратной совместимости с TradeModal, IdeaModal и PlaybookModal.
 */
export function TradeModalShell(props: TradeModalShellProps) {
  return <ModalShell size="lg" {...props} />;
}
