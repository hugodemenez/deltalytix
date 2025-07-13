import { NextResponse } from "next/server";
import { createClient, getWebsiteURL } from "@/server/auth";
import { stripe } from "@/app/[locale]/(landing)/actions/stripe";

async function handleBusinessCheckoutSession(user: any, websiteURL: string, businessName?: string) {
    // First, try to find existing customer
    const existingCustomers = await stripe.customers.list({
        email: user.email,
        limit: 1,
    });

    let customerId: string;

    if (existingCustomers.data.length > 0) {
        // Use existing customer
        customerId = existingCustomers.data[0].id;
    } else {
        // Create new customer if none exists
        const newCustomer = await stripe.customers.create({
            email: user.email,
        });
        customerId = newCustomer.id;
    }

    // Get the Business product price
    const prices = await stripe.prices.list({
        lookup_keys: ['business_monthly_usd'],
        expand: ['data.product'],
    });

    if (!prices.data.length) {
        return NextResponse.json({ message: "Business price not found" }, { status: 404 });
    }

    const price = prices.data[0];

    // Create session for business subscription
    const sessionConfig: any = {
        customer: customerId,
        metadata: {
            plan: 'business_monthly_usd',
            businessName: businessName || '',
            userId: user.id,
        },
        line_items: [
            {
                price: price.id,
                quantity: 1,
            },
        ],
        mode: 'subscription',
        payment_method_collection: 'if_required',
        success_url: `${websiteURL}dashboard/settings?success=business_created`,
        cancel_url: `${websiteURL}dashboard/settings?canceled=business_creation`,
        allow_promotion_codes: true,
        subscription_data: {
            metadata: {
                businessName: businessName || '',
                userId: user.id,
            }
        }
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.redirect(session.url as string, 303);
}

export async function POST(req: Request) {
    const body = await req.formData();
    const websiteURL = await getWebsiteURL();

    const businessName = body.get('businessName') as string | null;

    const supabase = await createClient();
    const {data:{user}} = await supabase.auth.getUser();
    
    if (!user) {
        return NextResponse.redirect(
            `${websiteURL}authentication?subscription=true&plan=business`,
            303
        );
    }

    return handleBusinessCheckoutSession(user, websiteURL, businessName || undefined);
}

export async function GET(req: Request) {
    const websiteURL = await getWebsiteURL();
    const { searchParams } = new URL(req.url);
    const businessName = searchParams.get('businessName');

    const supabase = await createClient();
    const {data:{user}} = await supabase.auth.getUser();
    
    if (!user) {
        return NextResponse.redirect(
            `${websiteURL}authentication?subscription=true&plan=business`,
            303
        );
    }

    return handleBusinessCheckoutSession(user, websiteURL, businessName || undefined);
} 