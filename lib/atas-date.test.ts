import { describe, expect, it } from "vitest";
import { formatAtasExcelDateCell } from "./atas-date";

describe("formatAtasExcelDateCell", () => {
  it("uses UTC wall-clock components instead of browser-local getters", () => {
    const excelDate = new Date(Date.UTC(2024, 5, 15, 14, 30, 45));

    expect(formatAtasExcelDateCell(excelDate)).toBe("2024-06-15 14:30:45");
  });
});
