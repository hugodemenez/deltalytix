import { ThemeProvider } from "@/context/theme-provider";
import { DataProvider } from "@/context/data-provider";
import { Toaster } from "@/components/ui/toaster";
import WidgetCanvas from "@/app/[locale]/dashboard/components/widget-canvas";
import Navbar from "@/app/[locale]/dashboard/components/navbar";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Helper function to validate CUID format
function isValidCuid(cuid: string): boolean {
  // CUID format: starts with 'c' followed by 24 characters (alphanumeric)
  const cuidRegex = /^c[a-z0-9]{24}$/;
  return cuidRegex.test(cuid);
}

export default async function AdminDashboardPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;

  const {
    slug
  } = params;

  // Validate slug format (CUID format used by Prisma)
  if (!slug || typeof slug !== 'string') {
    console.error('[AdminDashboardPage] Invalid slug parameter:', slug);
    notFound();
  }

  // Validate CUID format
  if (!isValidCuid(slug)) {
    console.error('[AdminDashboardPage] Invalid CUID format:', slug);
    notFound();
  }

  try {
    // Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { id: slug },
      select: { id: true, email: true } // Only select necessary fields
    });

    if (!user) {
      console.error('[AdminDashboardPage] User not found for slug:', slug);
      notFound();
    }

    console.log('[AdminDashboardPage] Admin dashboard accessed for user:', user.email);

    return (
      <ThemeProvider>
        <DataProvider adminView={{ userId: slug }}>
          <div className="min-h-screen flex flex-col bg-background">
            <Toaster />
            <div className="flex-1">
              <WidgetCanvas />
            </div>
          </div>
        </DataProvider>
      </ThemeProvider>
    );
  } catch (error) {
    console.error('[AdminDashboardPage] Database error while validating user:', error);
    notFound();
  }
}