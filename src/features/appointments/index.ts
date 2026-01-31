export {
  AppointmentsProvider,
  useAppointments,
} from "./context/AppointmentsContext";
export { appointmentsService } from "./services/appointments.service";
export { default as RequestDetailsView } from "./components/RequestDetailsView";
export type {
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
} from "./services/appointments.service";
