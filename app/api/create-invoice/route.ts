import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { id, amount, receiver } = body;

    const expiresAt = new Date(
      Date.now() + 1000 * 60 * 30
    ).toISOString();

    const { error } = await supabase
      .from("invoices")
      .insert([
        {
          id,
          amount,
          receiver,
          status: "pending",
          expires_at: expiresAt,
        },
      ]);

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Server error",
      },
      { status: 500 }
    );
  }
}