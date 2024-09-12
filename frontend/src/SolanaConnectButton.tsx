// SolanaConnectButton.tsx
import { FC } from 'react';
import { WalletMultiButton, WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import ('@solana/wallet-adapter-react-ui/styles.css');

export const SolanaConnectButton: FC = () => {
  return (
    <WalletModalProvider>
      <WalletMultiButton />
    </WalletModalProvider>
  );
};
