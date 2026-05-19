import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { webhookUrl, secret, payload } = body;

    if (!webhookUrl) {
      return NextResponse.json({ error: "No webhook URL" }, { status: 400 });
    }

    const payloadStr = JSON.stringify(payload);

    // Sign the payload with HMAC if secret provided
    const signature = secret
      ? crypto.createHmac("sha256", secret).update(payloadStr).digest("hex")
      : null;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Remlo-Event": "payment.settled",
      "X-Remlo-Timestamp": String(Date.now()),
    };

    if (signature) {
      headers["X-Remlo-Signature"] = `sha256=${signature}`;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: payloadStr,
    });

    return NextResponse.json({
      success: response.ok,
      status: response.status,
    });
  } catch (err: any) {
    console.error("[WEBHOOK ERROR]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
