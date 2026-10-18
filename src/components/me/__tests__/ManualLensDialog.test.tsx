// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import ManualLensDialog from "../ManualLensDialog";

vi.mock("next-intl", () => {
  const t = (key: string, values?: Record<string, unknown>) =>
    values ? `${key} ${Object.values(values).join(",")}` : key;
  t.has = () => true;
  return { useTranslations: () => t, useLocale: () => "en" };
});

afterEach(cleanup);

function renderDialog() {
  const onSave = vi.fn();
  render(
    <ManualLensDialog open onOpenChange={() => {}} defaultMount="X" brandSuggestions={[]} saving={false} onSave={onSave} />,
  );
  return onSave;
}

describe("ManualLensDialog", () => {
  it("moves to the next field on Enter instead of saving", () => {
    const onSave = renderDialog();
    const focalMin = screen.getByLabelText("focalLength");
    fireEvent.change(focalMin, { target: { value: "18" } });
    focalMin.focus();

    fireEvent.keyDown(focalMin, { key: "Enter" });

    expect(document.activeElement).toBe(screen.getByLabelText("focalMax"));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves a lens left unnamed under its focal length and aperture", () => {
    const onSave = renderDialog();
    fireEvent.change(screen.getByRole("combobox", { name: "brand" }), { target: { value: "Sigma" } });
    fireEvent.change(screen.getByLabelText("focalLength"), { target: { value: "18" } });
    fireEvent.change(screen.getByLabelText("focalMax"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("apertureWide"), { target: { value: "2.8" } });

    expect(screen.getByText("lensNameHint Sigma 18-50mm F2.8")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "save" }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ brand: "Sigma", model: "18-50mm F2.8", focalMaxMm: 50 }));
  });
});
