import type { Source } from "@/lib/types";

const createdAt = "2026-06-20T00:00:00.000Z";

export const seedSources: Source[] = [
  {
    id: "src_gateway_agents",
    title: "Gateway Nanopayments for AI Agents",
    authorName: "Lepton Research Desk",
    sourceUrl: "https://example.com/gateway-nanopayments-agents",
    doiOrCanonicalUrl: "https://example.com/gateway-nanopayments-agents",
    walletAddress: "0x8e6B53F4a6fA1C2dB8F6A611A329d7Aa2F91B001",
    citationPriceUSDC: "0.0002",
    abstract:
      "A technical note on how Gateway-style nanopayments let software agents purchase API calls and evidence fragments without account contracts.",
    evidenceText:
      "Gateway nanopayments convert a protected HTTP resource into a price-aware service. An agent requests a resource, receives a 402 challenge, attaches a payment authorization, and retries to unlock the response. The important design shift is that the agent can evaluate each request independently, which fits research workflows where only a subset of sources deserve paid access.",
    tags: ["gateway", "agents", "nanopayments", "x402", "usdc"],
    license: "CC BY 4.0",
    createdAt
  },
  {
    id: "src_x402_api_services",
    title: "x402 Payment Required for APIs",
    authorName: "Mira Ionescu",
    sourceUrl: "https://example.com/x402-api-services",
    doiOrCanonicalUrl: "https://example.com/x402-api-services",
    walletAddress: "0x4f4e595a9f7b5B2cC2214E8a7c9A18d705E0C402",
    citationPriceUSDC: "0.0003",
    abstract:
      "Explains how HTTP 402 can become an agent-readable negotiation point for paid API access and source evidence.",
    evidenceText:
      "The x402 pattern uses HTTP 402 as an explicit payment boundary. Instead of hiding monetization behind dashboards and subscriptions, a server can return pricing, recipient, and network metadata at request time. This lets autonomous clients decide whether the marginal value of one API call or evidence unlock exceeds its quoted price.",
    tags: ["x402", "http", "api", "payments", "agents"],
    license: "MIT",
    createdAt
  },
  {
    id: "src_creator_micropayments",
    title: "Creator Monetization with Micropayments",
    authorName: "Anika Sen",
    sourceUrl: "https://example.com/creator-micropayments",
    walletAddress: "0x2909F8A8439b3b7938EddA246908F01D031E1003",
    citationPriceUSDC: "0.00012",
    abstract:
      "A creator economy essay arguing that AI usage should produce small direct rewards for the sources that shape generated work.",
    evidenceText:
      "Direct micropayments make attribution measurable. A citation receipt does not prove quality or ownership by itself, but it creates an auditable trail that a machine customer paid a source owner because that source contributed useful evidence. This supports usage-based creator revenue without requiring every reader to subscribe.",
    tags: ["creators", "micropayments", "attribution", "ai"],
    license: "CC BY-SA 4.0",
    createdAt
  },
  {
    id: "src_agent_wallets",
    title: "Agent Wallets and Autonomous Spending",
    authorName: "Noah Park",
    sourceUrl: "https://example.com/agent-wallets",
    walletAddress: "0xf36aC8095524499dB79c4985E1845C8e4a75A004",
    citationPriceUSDC: "0.00045",
    abstract:
      "A security-oriented overview of agent wallets, spending limits, and budget policies for autonomous software.",
    evidenceText:
      "An agent wallet should operate under strict budget constraints, allowlists, and explicit policy checks. The strongest research-agent pattern is not unlimited autonomous spending, but scoped budgets with explainable allocation decisions and clear receipts for every paid action.",
    tags: ["wallets", "security", "budgets", "agents", "usdc"],
    license: "Apache-2.0",
    createdAt
  },
  {
    id: "src_arc_settlement",
    title: "Arc Stablecoin Settlement Notes",
    authorName: "Circle Systems Lab",
    sourceUrl: "https://example.com/arc-settlement-notes",
    walletAddress: "0xA7c0000000000000000000000000000000000005",
    citationPriceUSDC: "0.0001",
    abstract:
      "Notes on stablecoin settlement assumptions for low-value machine payments on Arc-compatible infrastructure.",
    evidenceText:
      "Stablecoin settlement is attractive for agent payments because the accounting unit is already digital, programmable, and globally legible. For very small payments, the user experience depends on low fees, fast authorization, and a receipt model that separates payment intent from final settlement when necessary.",
    tags: ["arc", "stablecoin", "settlement", "usdc"],
    license: "CC0",
    createdAt
  },
  {
    id: "src_ai_attribution",
    title: "Research Attribution in AI Systems",
    authorName: "Dr. Elena Vos",
    sourceUrl: "https://example.com/research-attribution-ai",
    doiOrCanonicalUrl: "10.0000/mecenas.demo.attribution",
    walletAddress: "0x04419b057dB121cE5B47Dc4Fd94707B6B5a6A006",
    citationPriceUSDC: "0.00025",
    abstract:
      "A short research memo on why generated answers need explicit evidence trails and source-level accounting.",
    evidenceText:
      "Attribution in AI systems should distinguish between discovery, preview use, full evidence access, and final citation. Paid evidence receipts add another layer: they show which sources crossed from candidate material into compensated evidence used by the agent.",
    tags: ["research", "attribution", "citations", "receipts"],
    license: "CC BY-NC 4.0",
    createdAt
  },
  {
    id: "src_paid_machine_apis",
    title: "Paid APIs for Machine Customers",
    authorName: "Jules Marceau",
    sourceUrl: "https://example.com/paid-machine-apis",
    walletAddress: "0x7A91F17E53DD919964b31e91A5F041A2dC2a0007",
    citationPriceUSDC: "0.00018",
    abstract:
      "A product architecture note for APIs that quote prices dynamically to machine clients.",
    evidenceText:
      "Machine customers can buy information one request at a time when the API exposes machine-readable price metadata. This makes procurement granular: the client can skip broad or redundant resources, buy only high-fit responses, and preserve a ledger of why each payment happened.",
    tags: ["apis", "machine-customers", "pricing", "ledger"],
    license: "MIT",
    createdAt
  },
  {
    id: "src_payment_rails_limits",
    title: "Economic Limits of Traditional Payment Rails",
    authorName: "Priya Raman",
    sourceUrl: "https://example.com/payment-rails-limits",
    walletAddress: "0xFb5532121212A0fA93e4F7A2A8e10381970A0008",
    citationPriceUSDC: "0.0009",
    abstract:
      "Compares subscriptions, card fees, account minimums, and settlement delays against sub-cent software payments.",
    evidenceText:
      "Traditional payment rails often make sub-cent transactions uneconomic because fixed fees and settlement operations dominate the value moved. Agent-native stablecoin rails can reduce the minimum viable price of a useful information request, but they still require fraud controls, wallet policy, and clear user consent.",
    tags: ["payment-rails", "economics", "subscriptions", "stablecoins"],
    license: "CC BY 4.0",
    createdAt
  },
  {
    id: "src_generic_blockchain",
    title: "Generic Blockchain Payments Essay",
    authorName: "Demo Contributor",
    sourceUrl: "https://example.com/generic-blockchain-payments",
    walletAddress: "0x6D6f000000000000000000000000000000000009",
    citationPriceUSDC: "0.002",
    abstract:
      "A broad overview of blockchain payments with limited detail on AI agents, evidence pricing, or x402 workflows.",
    evidenceText:
      "Blockchain payments can transfer value between parties. Some systems use tokens, wallets, and transactions. The essay is intentionally broad and does not discuss evidence endpoints or research-agent budget allocation in depth.",
    tags: ["blockchain", "payments", "general"],
    license: "CC BY 4.0",
    createdAt
  },
  {
    id: "src_citation_risk",
    title: "Risks of Pay-per-Citation Research",
    authorName: "Samira Okafor",
    sourceUrl: "https://example.com/pay-per-citation-risks",
    walletAddress: "0xA8b6d389c679122E47151CE8d86A7EF1d8D00010",
    citationPriceUSDC: "0.00016",
    abstract:
      "A critique of pay-per-citation markets, including spam incentives, ownership ambiguity, and quality risks.",
    evidenceText:
      "Pay-per-citation systems can create perverse incentives if payment is mistaken for truth or peer review. A responsible design labels receipts as usage compensation, verifies ownership over time, keeps skipped-source explanations visible, and avoids claiming that payment proves academic merit.",
    tags: ["risk", "citations", "markets", "ownership", "quality"],
    license: "CC BY 4.0",
    createdAt
  }
];
