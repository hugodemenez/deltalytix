import { NextResponse } from "next/server";
import { createClient, getWebsiteURL } from "@/server/auth";
import { stripe } from "@/actions/stripe";

async function handleTeamCheckoutSession(user: any, websiteURL: string, teamName?: string, currency: 'USD' | 'EUR' = 'USD') {
    if (!stripe) {
        return NextResponse.json({ message: "Stripe is not configured" }, { status: 503 });
    }
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

    // Get the Team product price based on currency
    const lookupKey = `team_monthly_${currency.toLowerCase()}`;
    const prices = await stripe.prices.list({
        lookup_keys: [lookupKey],
        expand: ['data.product'],
    });

    if (!prices.data.length) {
        // Fallback to USD if the currency-specific price is not found
        const fallbackPrices = await stripe.prices.list({
            lookup_keys: ['team_monthly_usd'],
            expand: ['data.product'],
        });

        if (!fallbackPrices.data.length) {
            return NextResponse.json({ message: "Team price not found" }, { status: 404 });
        }

        // Use USD price but keep the detected currency for metadata
        const price = fallbackPrices.data[0];

        // Create session for team subscription
        const sessionConfig: any = {
            customer: customerId,
            metadata: {
                plan: lookupKey,
                teamName: teamName || '',
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
            success_url: `${websiteURL}dashboard/settings?success=team_created`,
            cancel_url: `${websiteURL}dashboard/settings?canceled=team_creation`,
            allow_promotion_codes: true,
            subscription_data: {
                trial_period_days: 7,
                metadata: {
                    teamName: teamName || '',
                    userId: user.id,
                }
            }
        };

        const session = await stripe.checkout.sessions.create(sessionConfig);
        return NextResponse.redirect(session.url as string, 303);
    }

    const price = prices.data[0];

    // Create session for team subscription
    const sessionConfig: any = {
        customer: customerId,
        metadata: {
            plan: lookupKey,
            teamName: teamName || '',
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
        success_url: `${websiteURL}dashboard/settings?success=team_created`,
        cancel_url: `${websiteURL}dashboard/settings?canceled=team_creation`,
        allow_promotion_codes: true,
        subscription_data: {
            trial_period_days: 7,
            metadata: {
                teamName: teamName || '',
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

    if (!stripe) {
        return NextResponse.json({ message: "Stripe is not configured" }, { status: 503 });
    }

    // Only use currency from form data, default to USD if not provided
    const formCurrency = body.get('currency') as string | null;
    const currency = formCurrency ? (formCurrency.toUpperCase() as 'USD' | 'EUR') : 'USD';

    const teamName = body.get('teamName') as string | null;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(
            `${websiteURL}authentication?subscription=true&plan=team`,
            303
        );
    }

    return handleTeamCheckoutSession(user, websiteURL, teamName || undefined, currency);
}

export async function GET(req: Request) {
    const websiteURL = await getWebsiteURL();
    const { searchParams } = new URL(req.url);
    const teamName = searchParams.get('teamName');
    // Default to USD for GET requests
    const currency: 'USD' | 'EUR' = 'USD';

    if (!stripe) {
        return NextResponse.json({ message: "Stripe is not configured" }, { status: 503 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.redirect(
            `${websiteURL}authentication?subscription=true&plan=team`,
            303
        );
    }

    return handleTeamCheckoutSession(user, websiteURL, teamName || undefined, currency);
} 