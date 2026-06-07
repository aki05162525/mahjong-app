import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { AppError } from "./errors";

export async function route<T>(handler: () => Promise<T>) {
  try {
    const data = await handler();
    return NextResponse.json(data);
  } catch (error) {
    // Next.js 内部エラー（redirect / notFound）を飲み込まない
    unstable_rethrow(error);

    if (error instanceof AppError) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: error.status }
      );
    }
    console.error(error);
    return NextResponse.json({ error: "内部エラー", code: "internal_error" }, { status: 500 });
  }
}
