/**
 * Custom error classes for service layer
 * Provides typed errors for better error handling and debugging
 */

export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export class TaskCreationError extends ServiceError {
  constructor(originalError?: unknown) {
    super("Failed to create task", "TASK_CREATION_FAILED", originalError);
    this.name = "TaskCreationError";
  }
}

export class TaskUpdateError extends ServiceError {
  constructor(originalError?: unknown) {
    super("Failed to update task", "TASK_UPDATE_FAILED", originalError);
    this.name = "TaskUpdateError";
  }
}

export class TaskNotFoundError extends ServiceError {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`, "TASK_NOT_FOUND");
    this.name = "TaskNotFoundError";
  }
}

export class VehicleCreationError extends ServiceError {
  constructor(originalError?: unknown) {
    super("Failed to create vehicle", "VEHICLE_CREATION_FAILED", originalError);
    this.name = "VehicleCreationError";
  }
}

export class VehicleNotFoundError extends ServiceError {
  constructor(identifier: string) {
    super(`Vehicle not found: ${identifier}`, "VEHICLE_NOT_FOUND");
    this.name = "VehicleNotFoundError";
  }
}

export class AppointmentCreationError extends ServiceError {
  constructor(originalError?: unknown) {
    super(
      "Failed to create appointment",
      "APPOINTMENT_CREATION_FAILED",
      originalError,
    );
    this.name = "AppointmentCreationError";
  }
}

export class AppointmentNotFoundError extends ServiceError {
  constructor(appointmentId: string) {
    super(`Appointment not found: ${appointmentId}`, "APPOINTMENT_NOT_FOUND");
    this.name = "AppointmentNotFoundError";
  }
}

export class UserNotFoundError extends ServiceError {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`, "USER_NOT_FOUND");
    this.name = "UserNotFoundError";
  }
}

export class NotificationCreationError extends ServiceError {
  constructor(originalError?: unknown) {
    super(
      "Failed to create notification",
      "NOTIFICATION_CREATION_FAILED",
      originalError,
    );
    this.name = "NotificationCreationError";
  }
}

export class ProposalCreationError extends ServiceError {
  constructor(originalError?: unknown) {
    super(
      "Failed to create proposal",
      "PROPOSAL_CREATION_FAILED",
      originalError,
    );
    this.name = "ProposalCreationError";
  }
}

export class ChatMessageError extends ServiceError {
  constructor(originalError?: unknown) {
    super("Failed to send message", "CHAT_MESSAGE_FAILED", originalError);
    this.name = "ChatMessageError";
  }
}
