import { getTraderById } from "../actions/user";

export async function TraderInfo({ slug }: { slug: string }) {
  // GET TRADER INFO (email)
  const traderInfoResponse = await getTraderById(slug);

    return (
        <div >
            <h2 className="text-lg font-semibold mb-2">Trader Information</h2>
            <p><strong>Email:</strong> {traderInfoResponse?.email
            ?
            traderInfoResponse.email
            :
            <span className="text-gray-500">No email</span>}</p>
        </div>
    );
}