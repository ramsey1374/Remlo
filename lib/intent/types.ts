export type PaymentIntent = {
  id: string;

  recipient: `0x${string}`;

  amount: string;

  token: `0x${string}`;

  preferredChain?: number;

  createdAt?: number; // ✅ FIX: now optional

  status?: "pending" | "settled";
};