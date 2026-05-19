export async function getUnifiedBalances(wallet: string) {
  const res = await fetch(`/api/balances?wallet=${wallet}`);
  if (!res.ok) throw new Error("Failed to fetch balances");
  return res.json();
}
