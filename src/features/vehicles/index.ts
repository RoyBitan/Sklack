export { useVehicles, VehiclesProvider } from "./context/VehiclesContext";
export { vehiclesService } from "./services/vehicles.service";
export { default as VehiclesView } from "./components/VehiclesView";
export { default as AddVehicleModal } from "./components/AddVehicleModal";
export { default as VehicleCard } from "./components/VehicleCard";
export type {
  CreateVehicleDTO,
  UpdateVehicleDTO,
} from "./services/vehicles.service";
