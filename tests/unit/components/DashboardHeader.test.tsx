import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardHeader } from "@/src/features/tasks/components/ManagerDashboard/components/DashboardHeader";
import { mockProfile } from "@/tests/mocks";

describe("DashboardHeader", () => {
  it("renders the user's first name", () => {
    render(<DashboardHeader profile={mockProfile} />);
    expect(screen.getByText(/שלום, John/)).toBeInTheDocument();
  });

  it("renders the organization name when available", () => {
    const profileWithOrg = {
      ...mockProfile,
      organization: { id: "org-123", name: "My Professional Garage" },
    } as any;
    render(<DashboardHeader profile={profileWithOrg} />);
    expect(screen.getByText("My Professional Garage")).toBeInTheDocument();
  });

  it("renders default greeting when no profile is provided", () => {
    render(<DashboardHeader profile={null} />);
    expect(screen.getByText(/שלום, מנהל/)).toBeInTheDocument();
  });
});
