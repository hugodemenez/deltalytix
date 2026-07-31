import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const stripeMock = vi.hoisted(() => ({
  customers: {
    search: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  subscriptions: {
    list: vi.fn(),
  },
  charges: {
    list: vi.fn(),
  },
  invoices: {
    list: vi.fn(),
  },
}));

vi.mock("@/server/stripe", () => ({ stripe: stripeMock }));

const {
  resolveStripeCustomerForUser,
  synchronizeStripeCustomerEmailForUser,
} = await import("./stripe-customer");

type FakeCustomer = {
  id: string;
  email: string;
  metadata: Record<string, string>;
};

const fakeCustomer = (
  id: string,
  email: string,
  userId?: string,
): FakeCustomer => ({
  id,
  email,
  metadata: userId ? { user_id: userId } : {},
});

/**
 * Stripe Search only ever returns customers already carrying our metadata; the
 * email list is what surfaces legacy customers. Model both so the ordering the
 * resolver depends on is exercised.
 */
function givenStripeCustomers(customers: FakeCustomer[]) {
  stripeMock.customers.search.mockImplementation(({ query }: { query: string }) => {
    const userId = query.match(/'(.*)'$/)?.[1];
    return Promise.resolve({
      data: customers.filter((customer) => customer.metadata.user_id === userId),
    });
  });
  stripeMock.customers.list.mockImplementation(({ email }: { email: string }) =>
    Promise.resolve({
      data: customers.filter((customer) => customer.email === email),
    }),
  );
}

function givenSubscriptionCounts(counts: Record<string, number>) {
  stripeMock.subscriptions.list.mockImplementation(
    ({ customer }: { customer: string }) =>
      Promise.resolve({ data: Array.from({ length: counts[customer] ?? 0 }) }),
  );
}

/**
 * Lifetime plans check out in `mode: 'payment'`, so their only trace is a
 * succeeded charge — no subscription is ever created.
 */
function givenSucceededCharges(counts: Record<string, number>) {
  stripeMock.charges.list.mockImplementation(({ customer }: { customer: string }) =>
    Promise.resolve({
      data: Array.from({ length: counts[customer] ?? 0 }, () => ({
        status: "succeeded",
        paid: true,
      })),
    }),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  stripeMock.customers.search.mockResolvedValue({ data: [] });
  stripeMock.customers.list.mockResolvedValue({ data: [] });
  stripeMock.subscriptions.list.mockResolvedValue({ data: [] });
  stripeMock.charges.list.mockResolvedValue({ data: [] });
  stripeMock.invoices.list.mockResolvedValue({ data: [] });
  stripeMock.customers.create.mockImplementation(
    (params: Record<string, unknown>) =>
      Promise.resolve({ id: "cus_new", ...params }),
  );
  stripeMock.customers.update.mockImplementation(
    (id: string, params: Record<string, unknown>) =>
      Promise.resolve({ id, ...params }),
  );
});

describe("resolveStripeCustomerForUser", () => {
  it("prefers the customer already claimed by this user over a legacy match", async () => {
    givenStripeCustomers([
      fakeCustomer("cus_owned", "user@example.com", "user-1"),
      fakeCustomer("cus_legacy", "user@example.com"),
    ]);

    const customer = await resolveStripeCustomerForUser({
      userId: "user-1",
      email: "user@example.com",
    });

    expect(customer?.id).toBe("cus_owned");
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
  });

  it("claims a single legacy customer instead of creating a new one", async () => {
    givenStripeCustomers([fakeCustomer("cus_legacy", "user@example.com")]);

    const customer = await resolveStripeCustomerForUser({
      userId: "user-1",
      email: "user@example.com",
      createIfMissing: true,
    });

    expect(customer?.id).toBe("cus_legacy");
    expect(stripeMock.customers.update).toHaveBeenCalledWith("cus_legacy", {
      metadata: { user_id: "user-1" },
    });
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
  });

  it("creates a customer when nothing claimable exists", async () => {
    givenStripeCustomers([fakeCustomer("cus_other", "user@example.com", "user-2")]);

    const customer = await resolveStripeCustomerForUser({
      userId: "user-1",
      email: "User@Example.com",
      createIfMissing: true,
    });

    expect(stripeMock.customers.create).toHaveBeenCalledWith({
      email: "user@example.com",
      metadata: { user_id: "user-1" },
    });
    expect(customer?.id).toBe("cus_new");
  });

  it("recovers the paying customer when ambiguous legacy customers share an email", async () => {
    givenStripeCustomers([
      fakeCustomer("cus_empty", "user@example.com"),
      fakeCustomer("cus_paying", "user@example.com"),
    ]);
    givenSubscriptionCounts({ cus_paying: 1 });

    const customer = await resolveStripeCustomerForUser({
      userId: "user-1",
      email: "user@example.com",
      createIfMissing: true,
    });

    expect(customer?.id).toBe("cus_paying");
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
  });

  it("recovers the lifetime customer, which has a charge but no subscription", async () => {
    givenStripeCustomers([
      fakeCustomer("cus_empty", "user@example.com"),
      fakeCustomer("cus_lifetime", "user@example.com"),
    ]);
    givenSubscriptionCounts({});
    givenSucceededCharges({ cus_lifetime: 1 });

    const customer = await resolveStripeCustomerForUser({
      userId: "user-1",
      email: "user@example.com",
      createIfMissing: true,
    });

    expect(customer?.id).toBe("cus_lifetime");
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
  });

  it("refuses to pick between a canceled subscription and a lifetime purchase", async () => {
    givenStripeCustomers([
      fakeCustomer("cus_canceled", "user@example.com"),
      fakeCustomer("cus_lifetime", "user@example.com"),
    ]);
    givenSubscriptionCounts({ cus_canceled: 1 });
    givenSucceededCharges({ cus_lifetime: 1 });

    const customer = await resolveStripeCustomerForUser({
      userId: "user-1",
      email: "user@example.com",
      createIfMissing: true,
    });

    expect(customer).toBeNull();
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
  });

  it("ignores failed charges when deciding a candidate is an empty shell", async () => {
    givenStripeCustomers([
      fakeCustomer("cus_failed", "user@example.com"),
      fakeCustomer("cus_paying", "user@example.com"),
    ]);
    givenSubscriptionCounts({ cus_paying: 1 });
    stripeMock.charges.list.mockImplementation(({ customer }: { customer: string }) =>
      Promise.resolve({
        data:
          customer === "cus_failed"
            ? [{ status: "failed", paid: false }]
            : [],
      }),
    );

    const customer = await resolveStripeCustomerForUser({
      userId: "user-1",
      email: "user@example.com",
      createIfMissing: true,
    });

    expect(customer?.id).toBe("cus_paying");
  });

  it("creates a customer when every ambiguous candidate is an empty shell", async () => {
    givenStripeCustomers([
      fakeCustomer("cus_empty_1", "user@example.com"),
      fakeCustomer("cus_empty_2", "user@example.com"),
    ]);
    givenSubscriptionCounts({});

    const customer = await resolveStripeCustomerForUser({
      userId: "user-1",
      email: "user@example.com",
      createIfMissing: true,
    });

    expect(customer?.id).toBe("cus_new");
  });

  it("refuses to create when several ambiguous candidates hold subscriptions", async () => {
    givenStripeCustomers([
      fakeCustomer("cus_paying_1", "user@example.com"),
      fakeCustomer("cus_paying_2", "user@example.com"),
    ]);
    givenSubscriptionCounts({ cus_paying_1: 1, cus_paying_2: 1 });

    const customer = await resolveStripeCustomerForUser({
      userId: "user-1",
      email: "user@example.com",
      createIfMissing: true,
    });

    expect(customer).toBeNull();
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
  });

  it("finds the customer through the previous email while Stripe still has the old one", async () => {
    givenStripeCustomers([fakeCustomer("cus_legacy", "old@example.com")]);

    const customer = await resolveStripeCustomerForUser({
      userId: "user-1",
      email: "new@example.com",
      previousEmail: "old@example.com",
      createIfMissing: true,
      synchronizeEmail: true,
    });

    expect(customer?.id).toBe("cus_legacy");
    expect(stripeMock.customers.update).toHaveBeenCalledWith("cus_legacy", {
      email: "new@example.com",
      metadata: { user_id: "user-1" },
    });
  });

  it("returns null without creating when createIfMissing is off", async () => {
    givenStripeCustomers([]);

    await expect(
      resolveStripeCustomerForUser({ userId: "user-1", email: "user@example.com" }),
    ).resolves.toBeNull();
    expect(stripeMock.customers.create).not.toHaveBeenCalled();
  });

  it("still resolves by email when Stripe Search is unavailable", async () => {
    givenStripeCustomers([fakeCustomer("cus_owned", "user@example.com", "user-1")]);
    stripeMock.customers.search.mockRejectedValue(new Error("search unavailable"));

    const customer = await resolveStripeCustomerForUser({
      userId: "user-1",
      email: "user@example.com",
    });

    expect(customer?.id).toBe("cus_owned");
  });
});

describe("synchronizeStripeCustomerEmailForUser", () => {
  it("renames the customer found under the previous email", async () => {
    givenStripeCustomers([fakeCustomer("cus_legacy", "old@example.com")]);

    const result = await synchronizeStripeCustomerEmailForUser({
      userId: "user-1",
      previousEmail: "old@example.com",
      email: "New@Example.com",
    });

    expect(result).toEqual({
      status: "synchronized",
      customer: {
        id: "cus_legacy",
        email: "new@example.com",
        metadata: { user_id: "user-1" },
      },
    });
  });

  it("reports ambiguity instead of silently doing nothing", async () => {
    givenStripeCustomers([
      fakeCustomer("cus_paying_1", "old@example.com"),
      fakeCustomer("cus_paying_2", "old@example.com"),
    ]);
    givenSubscriptionCounts({ cus_paying_1: 1, cus_paying_2: 3 });

    const result = await synchronizeStripeCustomerEmailForUser({
      userId: "user-1",
      previousEmail: "old@example.com",
      email: "new@example.com",
    });

    expect(result).toEqual({
      status: "ambiguous",
      customerIds: ["cus_paying_1", "cus_paying_2"],
    });
    expect(stripeMock.customers.update).not.toHaveBeenCalled();
  });

  it("reports not_found when the user has no Stripe customer", async () => {
    givenStripeCustomers([]);

    const result = await synchronizeStripeCustomerEmailForUser({
      userId: "user-1",
      previousEmail: "old@example.com",
      email: "new@example.com",
    });

    expect(result).toEqual({ status: "not_found" });
    expect(stripeMock.customers.update).not.toHaveBeenCalled();
  });
});
