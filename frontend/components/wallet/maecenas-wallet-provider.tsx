"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createWaasWalletAccounts, getChainsMissingWaasWalletAccounts } from "@dynamic-labs-sdk/client/waas";
import {
  getNetworksData,
  logout,
  signMessage,
  switchActiveNetwork
} from "@dynamic-labs-sdk/client";
import type { EvmWalletAccount } from "@dynamic-labs-sdk/evm";
import { createWalletClientForWalletAccount } from "@dynamic-labs-sdk/evm/viem";
import {
  useGetWalletAccounts,
  useInitStatus,
  useOnEvent,
  useUser
} from "@dynamic-labs-sdk/react-hooks";
import type { Address } from "viem";
import { authenticateBackendWallet } from "@/lib/backend-wallet-auth";
import {
  clearWalletSession,
  syncWalletAddress
} from "@/lib/browser-session";
import {
  createCirclePaymentPayload,
  ensureCircleGatewayFunds,
  type X402TypedData
} from "@/lib/circle-payment";
import { signCircleGatewayWithdrawal } from "@/lib/circle-withdrawal";
import {
  dynamicClient,
  isDynamicConfigured
} from "@/lib/dynamic-client";
import { signSourceOwnership as createSourceAttestation } from "@/lib/source-attestation";
import type { GatewayBurnIntent, SearchPaymentIntentResponse } from "@/types";
import { DynamicWalletDialog } from "@/components/wallet/dynamic-wallet-dialog";

type PaymentRequired = NonNullable<SearchPaymentIntentResponse["paymentRequired"]>;

type MaecenasWalletContextValue = {
  address: string;
  authenticate: () => Promise<string>;
  closeWallet: () => void;
  createPaymentPayload: (paymentRequired: PaymentRequired) => Promise<unknown>;
  ensureGatewayFunds: (amountUSDC: string) => Promise<void>;
  isConfigured: boolean;
  isReady: boolean;
  logout: () => Promise<void>;
  openWallet: () => void;
  signGatewayWithdrawal: (burnIntent: GatewayBurnIntent) => Promise<string>;
  signSourceOwnership: (sourceUrl: string) => Promise<string>;
};

const MaecenasWalletContext = createContext<MaecenasWalletContextValue | null>(null);

function isArcTestnetNetwork(network: {
  chain: string;
  displayName?: string;
  name?: string;
  networkId: string;
  testnet?: boolean;
}) {
  if (network.chain !== "EVM") return false;
  const haystack = [
    network.networkId,
    network.name ?? "",
    network.displayName ?? ""
  ].join(" ").toLowerCase();
  return haystack.includes("5042002") || haystack.includes("arc testnet") || haystack.includes("arc-testnet");
}

export function MaecenasWalletProvider({ children }: { children: React.ReactNode }) {
  const { data: accounts = [] } = useGetWalletAccounts();
  const { data: initStatus, error: initError } = useInitStatus();
  const { data: user } = useUser();
  const [isWalletOpen, setWalletOpen] = useState(false);
  const [provisioningError, setProvisioningError] = useState("");
  const [isProvisioning, setProvisioning] = useState(false);
  const provisioningRef = useRef(false);

  const walletAccount = useMemo(
    () => accounts.find((account) => account.chain === "EVM") as EvmWalletAccount | undefined,
    [accounts]
  );
  const address = walletAccount?.address.toLowerCase() ?? "";

  const provisionWallet = useCallback(async () => {
    if (!isDynamicConfigured || provisioningRef.current) return;

    const missingChains = getChainsMissingWaasWalletAccounts(dynamicClient);
    if (!missingChains.includes("EVM")) return;

    provisioningRef.current = true;
    setProvisioning(true);
    setProvisioningError("");
    try {
      await createWaasWalletAccounts({ chains: ["EVM"] }, dynamicClient);
    } catch (cause) {
      setProvisioningError(
        cause instanceof Error ? cause.message : "Dynamic could not create the embedded wallet"
      );
    } finally {
      provisioningRef.current = false;
      setProvisioning(false);
    }
  }, []);

  useOnEvent({
    event: "userChanged",
    listener: (nextUser) => {
      if (nextUser) void provisionWallet();
    }
  });

  useEffect(() => {
    if (user && !walletAccount && initStatus === "finished") {
      void provisionWallet();
    }
  }, [initStatus, provisionWallet, user, walletAccount]);

  useEffect(() => {
    if (address) {
      syncWalletAddress(address);
    } else if (initStatus === "finished" && !user) {
      clearWalletSession();
    }
  }, [address, initStatus, user]);

  const requireWallet = useCallback(() => {
    if (!walletAccount) {
      setWalletOpen(true);
      throw new Error("Connect your Dynamic wallet to continue");
    }
    return walletAccount;
  }, [walletAccount]);

  const signWithWallet = useCallback(async (message: string) => {
    const account = requireWallet();
    const result = await signMessage(
      { walletAccount: account, message },
      dynamicClient
    );
    return result.signature;
  }, [requireWallet]);

  const authenticate = useCallback(async () => {
    const account = requireWallet();
    return authenticateBackendWallet(account.address, signWithWallet);
  }, [requireWallet, signWithWallet]);

  const signSourceOwnership = useCallback(async (sourceUrl: string) => {
    const account = requireWallet();
    await authenticateBackendWallet(account.address, signWithWallet);
    return createSourceAttestation(sourceUrl, account.address, signWithWallet);
  }, [requireWallet, signWithWallet]);

  const createPaymentPayload = useCallback(async (paymentRequired: PaymentRequired) => {
    const account = requireWallet();
    const walletClient = await createWalletClientForWalletAccount(
      { walletAccount: account },
      dynamicClient
    );

    return createCirclePaymentPayload(
      paymentRequired,
      account.address as Address,
      (typedData: X402TypedData) =>
        walletClient.signTypedData(typedData)
    );
  }, [requireWallet]);

  const ensureGatewayFunds = useCallback(async (amountUSDC: string) => {
    const account = requireWallet();
    const networks = getNetworksData(dynamicClient);
    const arcNetwork = networks.find(isArcTestnetNetwork);
    if (!arcNetwork) {
      const availableEvmNetworks = networks
        .filter((network) => network.chain === "EVM")
        .map((network) => `${network.displayName || network.name} (${network.networkId})`)
        .join(", ");
      throw new Error(
        availableEvmNetworks
          ? `Arc Testnet is missing from this Dynamic environment. EVM networks returned: ${availableEvmNetworks}`
          : "Dynamic returned no EVM networks. Enable EVM and Arc Testnet in this environment."
      );
    }
    await switchActiveNetwork(
      { networkId: arcNetwork.networkId, walletAccount: account },
      dynamicClient
    );
    const walletClient = await createWalletClientForWalletAccount(
      { walletAccount: account },
      dynamicClient
    );
    await ensureCircleGatewayFunds(
      walletClient,
      account.address as Address,
      amountUSDC
    );
  }, [requireWallet]);

  const signGatewayWithdrawal = useCallback(async (burnIntent: GatewayBurnIntent) => {
    const account = requireWallet();
    const walletClient = await createWalletClientForWalletAccount(
      { walletAccount: account },
      dynamicClient
    );
    return signCircleGatewayWithdrawal(walletClient, burnIntent);
  }, [requireWallet]);

  const handleLogout = useCallback(async () => {
    await logout(dynamicClient);
    clearWalletSession();
    setWalletOpen(false);
  }, []);

  const value = useMemo<MaecenasWalletContextValue>(() => ({
    address,
    authenticate,
    closeWallet: () => setWalletOpen(false),
    createPaymentPayload,
    ensureGatewayFunds,
    isConfigured: isDynamicConfigured,
    isReady: initStatus === "finished",
    logout: handleLogout,
    openWallet: () => setWalletOpen(true),
    signGatewayWithdrawal,
    signSourceOwnership
  }), [
    address,
    authenticate,
    createPaymentPayload,
    ensureGatewayFunds,
    handleLogout,
    initStatus,
    signGatewayWithdrawal,
    signSourceOwnership
  ]);

  return (
    <MaecenasWalletContext.Provider value={value}>
      {children}
      <DynamicWalletDialog
        address={address}
        email={user?.email ?? undefined}
        error={provisioningError || initError?.message}
        isConfigured={isDynamicConfigured}
        isOpen={isWalletOpen}
        isProvisioning={isProvisioning}
        onClose={() => setWalletOpen(false)}
      />
    </MaecenasWalletContext.Provider>
  );
}

export function useMaecenasWallet(): MaecenasWalletContextValue {
  const context = useContext(MaecenasWalletContext);
  if (!context) {
    throw new Error("useMaecenasWallet must be used within MaecenasWalletProvider");
  }
  return context;
}
