import { useState, useContext, createContext, useEffect } from 'react';
import { CanvasClient } from '@dscvr-one/canvas-client-sdk';
import { registerCanvasWallet } from '@dscvr-one/canvas-wallet-adapter';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { encode } from 'bs58';
import { toast } from 'react-toastify';

const WalletContext = createContext(null);

const SOLANA_MAINNET_CHAIN_ID = "solana:101"; // Solana mainnet chain ID

export const CanvasWalletProvider = ({ children }) => {
    const [canvasClient, setCanvasClient] = useState(null);
    const [walletAddress, setWalletAddress] = useState(null);
    const [walletIcon, setWalletIcon] = useState(null);
    const [iframe, setIframe] = useState(false);
    const [userInfo, setUserInfo] = useState(undefined);
    const [content, setContent] = useState(undefined);

    useEffect(() => {
        const isIframe = () => {
            try {
                return window.self !== window.top;
            } catch (e) {
                return true;
            }
        };

        setIframe(isIframe());

        if (isIframe()) {
            const client = new CanvasClient();
            registerCanvasWallet(client);
            setCanvasClient(client);
            console.log("CanvasClient initialized");
        }
    }, []);

    const connectWallet = async () => {
        if (canvasClient) {
            try {
                const info = await canvasClient.ready();
                if (info?.untrusted) {
                    const { user, content } = info.untrusted;
                    setUserInfo(user);
                    setContent(content);
                } else {
                    console.error('Failed to retrieve user information');
                }
                await canvasClient.ready();
                console.log("CanvasClient is ready");

                const response = await canvasClient.connectWallet(SOLANA_MAINNET_CHAIN_ID);

                if (response?.untrusted?.success) {
                    setWalletAddress(response.untrusted.address);
                    setWalletIcon(response.untrusted.walletIcon);
                    toast.success("Wallet connected")
                    console.log('Wallet connected:', response.untrusted.address);
                } else {
                    toast.error('Failed to connect');
                    console.error('Failed to connect wallet');
                }
            } catch (error) {
                console.error('Error connecting wallet:', error);
            }
        } else {
            toast.error('CanvasClient is not initialized, cannot connect wallet');
            console.error('CanvasClient is not initialized');
        }
    };

    const signTransaction = async (transaction) => {
        if (!canvasClient || !walletAddress) {
            console.error('CanvasClient or walletAddress is not available');
            return null;
        }

        try {
            const network = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.devnet.solana.com/";
            const connection = new Connection(network, 'confirmed');

            // Fetch the latest blockhash
            const { blockhash } = await connection.getLatestBlockhash({ commitment: "finalized" });
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = new PublicKey(walletAddress);

            // Serialize the transaction
            const serializedTx = transaction.serialize({
                requireAllSignatures: false,
                verifySignatures: false,
            });

            const base58Tx = encode(serializedTx);

            // Sign and send the transaction via canvasClient
            const results = await canvasClient.signAndSendTransaction({
                unsignedTx: base58Tx,
                awaitCommitment: "confirmed",
                chainId: SOLANA_MAINNET_CHAIN_ID,
            });

            if (results?.untrusted?.success) {
                toast.success("transaction signed");
                console.log('Transaction signed:', results);
                return results;
            } else {
                toast.error('Failed to sign transaction');
                console.error('Failed to sign transaction');
            }
        } catch (error) {
            toast.error('Failed to sign transaction');
            console.error('Error signing transaction:', error);
        }
        return null;
    };

    const value = {
        connectWallet,
        walletAddress,
        walletIcon,
        signTransaction,
        iframe,
        userInfo,
        content,
        canvasClient,
    };

    return (
        <WalletContext.Provider value={value}>
            {children}
        </WalletContext.Provider>
    );
};

const useCanvasWallet = () => {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useCanvasWallet must be used within a CanvasWalletProvider');
    }
    return context;
};

export default useCanvasWallet;
