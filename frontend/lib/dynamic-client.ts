import { createDynamicClient } from "@dynamic-labs-sdk/client";
import { addWaasEvmExtension } from "@dynamic-labs-sdk/evm/waas";

export const dynamicEnvironmentId =
  process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ?? "";
export const isDynamicConfigured = Boolean(dynamicEnvironmentId);

export const dynamicClient = createDynamicClient({
  autoInitialize: false,
  environmentId: dynamicEnvironmentId || "dynamic-environment-not-configured",
  metadata: {
    name: "Maecenas",
    universalLink:
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  }
});

addWaasEvmExtension();
