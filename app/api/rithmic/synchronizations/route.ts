import { NextRequest, NextResponse } from "next/server";
import {
  getRithmicSynchronizations,
  setRithmicSynchronization,
  removeRithmicSynchronization,
} from "@/app/[locale]/dashboard/components/import/rithmic/sync/actions";
import { Synchronization } from "@/prisma/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const synchronizations = await getRithmicSynchronizations();
    return NextResponse.json({ success: true, data: synchronizations });
  } catch (error) {
    console.error("Error fetching Rithmic synchronizations:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch synchronizations",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const synchronization: Partial<Synchronization> = body;

    await setRithmicSynchronization(synchronization);
    return NextResponse.json({
      success: true,
      message: "Synchronization updated successfully",
    });
  } catch (error) {
    console.error("Error setting Rithmic synchronization:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to update synchronization",
      },
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

    await removeRithmicSynchronization(accountId);

    return NextResponse.json({
      success: true,
      message: "Synchronization removed successfully",
    });
  } catch (error) {
    console.error("Error deleting Rithmic synchronization:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to delete synchronization",
      },
      { status: 500 }
    );
  }
}
