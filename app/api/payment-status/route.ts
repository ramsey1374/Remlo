import { NextResponse } from "next/server";

import { supabase } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } =
      new URL(req.url);

    const id =
      searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        {
          paid: false,
        },
        {
          status: 400,
        }
      );
    }

    const { data, error } =
      await supabase
        .from("invoices")
        .select("status")
        .eq("id", id)
        .single();

    if (error || !data) {
      return NextResponse.json(
        {
          paid: false,
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      paid:
        data.status === "paid",
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        paid: false,
      },
      {
        status: 500,
      }
    );
  }
}