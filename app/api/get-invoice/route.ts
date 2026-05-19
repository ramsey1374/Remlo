import { NextResponse } from "next/server";
import { supabase } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const id = searchParams.get("id");

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({
      error: error.message,
    });
  }

  return NextResponse.json(data);
}
