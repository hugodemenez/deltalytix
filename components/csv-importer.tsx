'use client'
import { saveTrades } from "@/server/database";
import { CSVImporter } from "csv-import-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export default function CsvImporter() {
    const [isOpen, setIsOpen] = useState(false);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return null; // or a loading spinner, or some fallback UI
    }

    return (
        <div>
            <Button onClick={() => setIsOpen(true)}>Import CSV</Button>
            <CSVImporter
                modalIsOpen={isOpen}
                modalOnCloseTriggered={() => setIsOpen(false)}
                darkMode={true}
                onComplete={
                    (data: any) => {
                        saveTrades(data.rows.map((row: any) => row.values))
                    }
                }
                template={{
                    columns: [
                        {
                            name: "Quantity",
                            key: "quantity",
                            rquired: true,
                            description: "Contract quantity",
                            suggested_mappings: ["qty","quantity"],
                        },
                        {
                            name: "Trade buy ID",
                            key: "buyId",
                            rquired: false,
                            description: "Trade buy ID",
                            suggested_mappings: ["buyFillId"],
                        },
                        {
                            name: "Trade sell ID",
                            key: "sellId",
                            rquired: false,
                            description: "Trade sell ID",
                            suggested_mappings: ["sellFillId"],
                        },
                        {
                            name: "Instrument",
                            key: "instrument",
                            required: true,
                            description: "Traded instrument",
                            suggested_mappings: ["symbol"],
                        },
                        {
                            name: "PnL",
                            key: "pnl",
                            required: true,
                            description: "Trade PnL",
                            suggested_mappings: ["pnl"],
                        },
                        {
                            name: "Buy Date",
                            key: "buyDate",
                            required: true,
                            description: "Buy date of the trade",
                            suggested_mappings: ["boughtTimestamp"],
                        },
                        {
                            name: "Buy Price",
                            key: "buyPrice",
                            required: true,
                            description: "Buy price of the trade",
                            suggested_mappings: ["boughtPrice"],
                        },
                        {
                            name: "Sell date",
                            key: "sellDate",
                            required: true,
                            description: "Sell date of the trade",
                            suggested_mappings: ["soldTimestamp"],
                        },
                        {
                            name: "Sell price",
                            key: "sellPrice",
                            required: true,
                            description: "Sell price of the trade",
                            suggested_mappings: ["soldPrice"],
                        },

                        {
                            name: "Time in position",
                            key: "timeInPosition",
                            required: true,
                            description: "Time in position",
                            suggested_mappings: ["duration"],
                        },
                    ],
                }}
            />
        </div>


    )
}