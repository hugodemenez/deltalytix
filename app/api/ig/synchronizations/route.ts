import { NextRequest, NextResponse } from "next/server";
import {
  getIgSynchronizations,
  removeIgToken,
} from "@/app/[locale]/dashboard/components/import/ig/sync/actions";
import type { IgStoredCredentials } from "@/app/[locale]/dashboard/components/import/ig/sync/ig-types";

export async function GET() {
  try {
    const result = await getIgSynchronizations();
    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 },
      );
    }

    const sanitized = (result.synchronizations || []).map(
      ({ token, ...rest }) => {
        let accountNumbers: string[] = [];
        let identifier: string | null = null;
        let environment: string | null = null;

        if (token) {
          try {
            const parsed = JSON.parse(token) as IgStoredCredentials;
            identifier = parsed.identifier ?? null;
            environment = parsed.environment ?? null;
            if (Array.isArray(parsed.accountIds)) {
              accountNumbers = parsed.accountIds;
            }
          } catch {
            // ignore malformed token
          }
        }

        return {
          ...rest,
          hasToken: !!token,
          identifier,
          environment,
          accountNumbers,
        };
      },
    );

    return NextResponse.json({ success: true, data: sanitized });
  } catch (error) {
    console.error("Error listing IG synchronizations:", error);
    return NextResponse.json(
      { success: false, message: "LOAD_SYNCHRONIZATIONS_FAILED" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const accountId = body?.accountId as string | undefined;

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: "ACCOUNT_ID_REQUIRED" },
        { status: 400 },
      );
    }

    const result = await removeIgToken(accountId);
    if (result.error) {
      return NextResponse.json(
        { success: false, message: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Synchronization removed",
    });
  } catch (error) {
    console.error("Error deleting IG synchronization:", error);
    return NextResponse.json(
      { success: false, message: "DELETE_SYNC_FAILED" },
      { status: 500 },
    );
  }
}
