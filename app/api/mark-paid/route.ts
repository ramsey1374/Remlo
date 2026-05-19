import { NextResponse } from "next/server";

import { supabase } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { id } =
      await req.json();

    if (!id) {
      return NextResponse.json(
        {
          error:
            "Missing invoice id",
        },
        {
          status: 400,
        }
      );
    }

    const paymentSessionId =
      crypto.randomUUID();

    const { error } =
      await supabase
        .from("invoices")
        .update({
          status: "paid",

          paid_at:
            new Date().toISOString(),

          payment_session_id:
            paymentSessionId,
        })
        .eq("id", id);

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error:
            "Database update failed",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,

      paymentSessionId,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error:
          "Internal server error",
      },
      {
        status: 500,
      }
    );
  }
}