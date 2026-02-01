/**
 * Custom error classes for service layer
 * Provides typed errors for better error handling and debugging
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly userMessage?: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, "VALIDATION_ERROR", 400, "אנא בדוק את הנתונים שהזנת");
  }
}

export class NetworkError extends AppError {
  constructor(message: string) {
    super(message, "NETWORK_ERROR", 0, "בעיית חיבור לרשת. אנא נסה שוב.");
  }
}

export class ServiceError extends AppError {
  constructor(
    message: string,
    code: string,
    originalError?: unknown,
  ) {
    super(message, code, 500, undefined, originalError);
  }
}

export class TaskCreationError extends ServiceError {
  constructor(originalError?: unknown) {
    super("Failed to create task", "TASK_CREATION_FAILED", originalError);
  }
}

export class TaskUpdateError extends ServiceError {
  constructor(originalError?: unknown) {
    super("Failed to update task", "TASK_UPDATE_FAILED", originalError);
  }
}

export class TaskNotFoundError extends ServiceError {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`, "TASK_NOT_FOUND");
  }
}

export class VehicleCreationError extends ServiceError {
  constructor(originalError?: unknown) {
    super("Failed to create vehicle", "VEHICLE_CREATION_FAILED", originalError);
  }
}

export class VehicleNotFoundError extends ServiceError {
  constructor(identifier: string) {
    super(`Vehicle not found: ${identifier}`, "VEHICLE_NOT_FOUND");
  }
}

export class AppointmentCreationError extends ServiceError {
  constructor(originalError?: unknown) {
    super(
      "Failed to create appointment",
      "APPOINTMENT_CREATION_FAILED",
      originalError,
    );
  }
}

export class AppointmentNotFoundError extends ServiceError {
  constructor(appointmentId: string) {
    super(`Appointment not found: ${appointmentId}`, "APPOINTMENT_NOT_FOUND");
  }
}

export class UserNotFoundError extends ServiceError {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`, "USER_NOT_FOUND");
  }
}

export class NotificationCreationError extends ServiceError {
  constructor(originalError?: unknown) {
    super(
      "Failed to create notification",
      "NOTIFICATION_CREATION_FAILED",
      originalError,
    );
  }
}

export class ProposalCreationError extends ServiceError {
  constructor(originalError?: unknown) {
    super(
      "Failed to create proposal",
      "PROPOSAL_CREATION_FAILED",
      originalError,
    );
  }
}

export class ChatMessageError extends ServiceError {
  constructor(originalError?: unknown) {
    super("Failed to send message", "CHAT_MESSAGE_FAILED", originalError);
  }
}
