import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
}
