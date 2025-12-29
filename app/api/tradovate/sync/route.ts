import { NextRequest, NextResponse } from "next/server";
import {
  getTradovateToken,
  getTradovateTrades,
} from "@/app/[locale]/dashboard/components/import/tradovate/actions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const accountId = body?.accountId as string | undefined;

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: "accountId is required" },
        { status: 400 }
      );
    }

    const tokenResult = await getTradovateToken(accountId);
    if (tokenResult.error || !tokenResult.accessToken) {
      return NextResponse.json(
        {
          success: false,
          message: tokenResult.error || "Missing Tradovate access token",
        },
        { status: 400 }
      );
    }

    const syncResult = await getTradovateTrades(tokenResult.accessToken);
    if (syncResult.error) {
      return NextResponse.json(
        { success: false, message: syncResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      savedCount: syncResult.savedCount ?? 0,
      ordersCount: syncResult.ordersCount ?? 0,
      message: "Sync completed",
    });
  } catch (error) {
    console.error("Error performing Tradovate sync:", error);
    return NextResponse.json(
      { success: false, message: "Failed to perform Tradovate sync" },
      { status: 500 }
    );
  }
}