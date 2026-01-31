import React from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Save } from "lucide-react";
import { useCreateTaskLogic } from "./hooks/useCreateTaskLogic";
import CreateTaskHeader from "./components/CreateTaskHeader";
import SubscriptionOverlay from "./components/SubscriptionOverlay";
import CustomerInfoSection from "./components/CustomerInfoSection";
import VehicleInfoSection from "./components/VehicleInfoSection";
import TaskDetailsSection from "./components/TaskDetailsSection";

interface CreateTaskModalProps {
  onClose: () => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ onClose }) => {
  const {
    formData,
    updateField,
    loading,
    loadingApi,
    error,
    // setError, // not used directly in view
    foundCustomer,
    foundVehicles,
    showVehicleSelect,
    setShowVehicleSelect,
    isFetchingPhone,
    lookupStatus,
    originalData,
    teamMembers,
    formRef,
    activeTasksCount,
    canAddMoreTasks,
    resetAutofill,
    handlePlateBlur,
    handleAutoFill,
    selectVehicle,
    handleSubmit,
  } = useCreateTaskLogic(onClose);

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in-up">
      <div
        ref={formRef}
        className="bg-white w-full h-full sm:h-auto sm:w-full sm:max-w-2xl sm:rounded-[2rem] shadow-2xl flex flex-col transition-all duration-300 relative overflow-hidden"
      >
        <SubscriptionOverlay
          canAddMoreTasks={canAddMoreTasks}
          activeTasksCount={activeTasksCount}
          onClose={onClose}
        />

        <CreateTaskHeader onClose={onClose} />

        <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 pb-24 sm:pb-8">
          <form
            id="create-task-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <CustomerInfoSection
              formData={formData}
              updateField={updateField}
              isFetchingPhone={isFetchingPhone}
              lookupStatus={lookupStatus}
              originalData={originalData}
              resetAutofill={resetAutofill}
              foundVehicles={foundVehicles}
              showVehicleSelect={showVehicleSelect}
              setShowVehicleSelect={setShowVehicleSelect}
              selectVehicle={selectVehicle}
            />

            <VehicleInfoSection
              formData={formData}
              updateField={updateField}
              handlePlateBlur={handlePlateBlur}
              handleAutoFill={handleAutoFill}
              loadingApi={loadingApi}
              showVehicleSelect={showVehicleSelect}
              setShowVehicleSelect={setShowVehicleSelect}
            />

            <TaskDetailsSection
              formData={formData}
              updateField={updateField}
              teamMembers={teamMembers}
            />

            {error && (
              <div className="bg-red-50 text-red-600 p-6 rounded-[1.5rem] flex items-center gap-4 border border-red-100 animate-shake">
                <AlertCircle size={24} />
                <p className="text-sm font-black">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 sm:p-8 border-t border-gray-100 bg-white sticky bottom-0 z-10 shrink-0 mb-safe">
          <button
            form="create-task-form"
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-3 touch-target"
          >
            {loading
              ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin">
                </div>
              )
              : (
                <>
                  <Save size={20} />
                  <span className="font-black text-lg">פתח כרטיס עבודה</span>
                </>
              )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default CreateTaskModal;
