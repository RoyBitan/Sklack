/**
 * API Services Index
 * Re-exports all service instances for convenient importing
 */

export { tasksService } from "./tasks.service";
export { vehiclesService } from "./vehicles.service";
export { appointmentsService } from "./appointments.service";
export { usersService } from "./users.service";
export { notificationsService } from "./notifications.service";
export { proposalsService } from "./proposals.service";
export { chatService } from "./chat.service";

// Re-export types/DTOs
export type {
  CreateTaskDTO,
  FetchTasksOptions,
  UpdateTaskDTO,
} from "./tasks.service";
export type {
  CreateVehicleDTO,
  FetchVehiclesOptions,
  UpdateVehicleDTO,
} from "./vehicles.service";
export type {
  CreateAppointmentDTO,
  FetchAppointmentsOptions,
  UpdateAppointmentDTO,
} from "./appointments.service";
export type { UpdateOrganizationDTO, UpdateProfileDTO } from "./users.service";
export type {
  CreateNotificationDTO,
  FetchNotificationsOptions,
} from "./notifications.service";
export type { CreateProposalDTO, UpdateProposalDTO } from "./proposals.service";
export type { SendMessageDTO } from "./chat.service";
