export {
  AppointmentsProvider,
  useAppointments,
} from "./context/AppointmentsContext";
export { appointmentsService } from "./services/appointments.service";
export { default as RequestDetailsView } from "./components/RequestDetailsView";
export { default as AppointmentsView } from "./components/AppointmentsView";
export type {
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
} from "./services/appointments.service";
