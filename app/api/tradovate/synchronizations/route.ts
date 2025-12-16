import { NextRequest, NextResponse } from "next/server";
import {
  getTradovateSynchronizations,
  removeTradovateToken,
} from "@/app/[locale]/dashboard/components/import/tradovate/actions";

export async function GET() {
  try {
    const result = await getTradovateSynchronizations();
    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.synchronizations || [],
    });
  } catch (error) {
    console.error("Error fetching Tradovate synchronizations:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch Tradovate synchronizations" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const accountId = body?.accountId as string | undefined;

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: "accountId is required" },
        { status: 400 }
      );
    }

    const result = await removeTradovateToken(accountId);
    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Synchronization removed",
    });
  } catch (error) {
    console.error("Error deleting Tradovate synchronization:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete synchronization" },
      { status: 500 }
    );
  }
}