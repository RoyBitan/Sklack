import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import Auth from "@/components/Auth";
import { supabase } from "@/lib/supabase";

describe("Auth User Journey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle authentication flow UI states", async () => {
    render(<Auth />);

    // Default is login
    expect(screen.getByText("כניסה")).toHaveClass(
      "bg-white text-black shadow-xl",
    );
    expect(screen.queryByPlaceholderText("ישראל ישראלי")).not
      .toBeInTheDocument();

    // Switch to register
    fireEvent.click(screen.getByText("הרשמה"));

    await waitFor(() => {
      expect(screen.getByText("הרשמה")).toHaveClass(
        "bg-white text-black shadow-xl",
      );
      expect(screen.getByPlaceholderText("ישראל ישראלי")).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /המשך בתהליך/i });
    await waitFor(() => expect(submitBtn).toBeDisabled());

    const nameInput = screen.getByPlaceholderText("ישראל ישראלי");
    fireEvent.change(nameInput, { target: { value: "A" } });
    fireEvent.blur(nameInput);

    expect(await screen.findByText("השם חייב להכיל לפחות 2 תווים"))
      .toBeInTheDocument();
  });

  it("should call supabase signin on login submit", async () => {
    render(<Auth />);

    // Fill credentials
    fireEvent.change(screen.getByPlaceholderText("name@company.com"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });

    const submitBtn = screen.getByText("היכנס למערכת");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });
});
