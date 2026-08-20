import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SalesforceConnectionDialog } from "@/components/salesforce-connection-dialog";

describe("SalesforceConnectionDialog", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("clears an unsaved session ID whenever the dialog is dismissed", () => {
    const onOpenChange = vi.fn();
    render(
      <SalesforceConnectionDialog
        open
        onOpenChange={onOpenChange}
        onConnected={vi.fn()}
      />,
    );

    const secretInput = screen.getByLabelText("Session ID");
    fireEvent.change(secretInput, { target: { value: "00D-secret-value" } });
    expect(secretInput).toHaveValue("00D-secret-value");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(secretInput).toHaveValue("");
    expect(window.sessionStorage.length).toBe(0);
  });
});
