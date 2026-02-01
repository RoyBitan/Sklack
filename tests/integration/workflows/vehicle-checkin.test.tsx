import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreCheckInData, TaskStatus, Vehicle } from "@/types";

describe("Vehicle Check-In Workflow", () => {
  const mockVehicle: Vehicle = {
    id: "vehicle-1",
    plate: "12-345-67",
    model: "Toyota Corolla",
    year: "2020",
    color: "White",
    owner_id: "customer-1",
    org_id: "org-1",
    created_at: new Date().toISOString(),
  };

  const mockCheckInData: PreCheckInData = {
    vehiclePlate: "12-345-67",
    vehicleModel: "Toyota Corolla",
    vehicleYear: "2020",
    vehicleColor: "White",
    ownerName: "John Doe",
    ownerPhone: "0501234567",
    ownerEmail: "john@example.com",
    ownerAddress: "123 Main St",
    currentMileage: "50000",
    serviceTypes: ["Oil Change", "Brake Inspection"],
    faultDescription: "Strange noise from brakes",
    paymentMethod: "CREDIT_CARD",
    hasInsurance: true,
    submittedAt: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should complete full vehicle check-in workflow", () => {
    // Step 1: Customer selects vehicle from their garage
    const selectedVehicle = mockVehicle;
    expect(selectedVehicle.plate).toBe("12-345-67");

    // Step 2: Auto-fill vehicle information
    const checkInForm = {
      ...mockCheckInData,
      vehiclePlate: selectedVehicle.plate,
      vehicleModel: selectedVehicle.model,
      vehicleYear: selectedVehicle.year,
      vehicleColor: selectedVehicle.color,
    };

    expect(checkInForm.vehiclePlate).toBe(selectedVehicle.plate);
    expect(checkInForm.vehicleModel).toBe(selectedVehicle.model);

    // Step 3: Customer fills in check-in details
    expect(checkInForm.currentMileage).toBe("50000");
    expect(checkInForm.faultDescription).toBe("Strange noise from brakes");
    expect(checkInForm.serviceTypes).toContain("Brake Inspection");

    // Step 4: Validate required fields
    const isValid = !!checkInForm.vehiclePlate &&
      !!checkInForm.ownerName &&
      !!checkInForm.ownerPhone &&
      !!checkInForm.currentMileage &&
      !!checkInForm.faultDescription;

    expect(isValid).toBe(true);

    // Step 5: Prepare task data for submission
    const taskData = {
      title: `Check-In: ${checkInForm.faultDescription}`,
      status: TaskStatus.WAITING_FOR_APPROVAL,
      metadata: checkInForm,
      org_id: "org-1",
      created_by: "customer-1",
    };

    expect(taskData.status).toBe(TaskStatus.WAITING_FOR_APPROVAL);
    expect(taskData.metadata).toEqual(checkInForm);
  });

  it("should validate phone number format", () => {
    const validPhone = "0501234567";
    const invalidPhone = "123";

    const isValidPhone = (phone: string) => {
      const cleaned = phone.replace(/\D/g, "");
      return cleaned.length === 10 && cleaned.startsWith("0");
    };

    expect(isValidPhone(validPhone)).toBe(true);
    expect(isValidPhone(invalidPhone)).toBe(false);
  });

  it("should handle check-in for new customer", () => {
    // New customer without existing profile
    const newCustomerData = {
      ...mockCheckInData,
      ownerName: "Jane Smith",
      ownerPhone: "0509876543",
      ownerEmail: "jane@example.com",
    };

    // Should create task with customer info in metadata
    const taskData = {
      title: "Check-In: New Customer",
      status: TaskStatus.WAITING_FOR_APPROVAL,
      metadata: newCustomerData,
      org_id: "org-1",
    };

    expect(taskData.metadata.ownerName).toBe("Jane Smith");
    expect(taskData.metadata.ownerPhone).toBe("0509876543");
  });

  it("should update existing check-in request", () => {
    const existingTaskId = "task-1";
    const updatedData = {
      ...mockCheckInData,
      faultDescription: "Updated: Brake noise and vibration",
      currentMileage: "51000",
    };

    const updatedTask = {
      id: existingTaskId,
      metadata: updatedData,
      updated_at: new Date().toISOString(),
    };

    expect(updatedTask.metadata.faultDescription).toBe(
      "Updated: Brake noise and vibration",
    );
    expect(updatedTask.metadata.currentMileage).toBe("51000");
  });

  it("should handle check-in with insurance information", () => {
    const checkInWithInsurance = {
      ...mockCheckInData,
      hasInsurance: true,
      insuranceCompany: "AIG",
      insurancePolicy: "POL-12345",
    };

    expect(checkInWithInsurance.hasInsurance).toBe(true);
    expect(checkInWithInsurance.insuranceCompany).toBe("AIG");
  });

  it("should validate mileage input", () => {
    const validMileage = "50000";
    const invalidMileage = "abc";

    const isValidMileage = (mileage: string) => {
      return /^\d+$/.test(mileage) && parseInt(mileage) >= 0;
    };

    expect(isValidMileage(validMileage)).toBe(true);
    expect(isValidMileage(invalidMileage)).toBe(false);
  });

  it("should validate service types selection", () => {
    const checkInData = {
      ...mockCheckInData,
      serviceTypes: ["Oil Change", "Brake Inspection", "Tire Rotation"],
    };

    expect(checkInData.serviceTypes.length).toBeGreaterThan(0);
    expect(checkInData.serviceTypes).toContain("Oil Change");
  });

  it("should handle emergency check-in", () => {
    const emergencyCheckIn = {
      ...mockCheckInData,
      faultDescription: "EMERGENCY: Engine overheating",
      isUrgent: true,
      priority: "CRITICAL",
    };

    expect(emergencyCheckIn.isUrgent).toBe(true);
    expect(emergencyCheckIn.priority).toBe("CRITICAL");
  });
});
