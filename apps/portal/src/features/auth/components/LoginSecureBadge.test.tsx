import { render, screen, waitFor } from "@testing-library/react";
import { LoginSecureBadge } from "./LoginSecureBadge";

describe("LoginSecureBadge", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, hostname: "localhost" },
    });
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("renders the compact secure label", () => {
    render(<LoginSecureBadge />);
    expect(screen.getByText("Secure")).toBeInTheDocument();
  });

  it("hydrates node status for localhost", async () => {
    render(<LoginSecureBadge />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Secure connection. Local Host Active. Cryptographic Validation: OK.",
      );
    });
  });

  it("reports remote host status when not local", async () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, hostname: "portal.arch-systems.com" },
    });

    render(<LoginSecureBadge />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveAttribute(
        "aria-label",
        "Secure connection. portal.arch-systems.com Active. Cryptographic Validation: OK.",
      );
    });
  });
});
