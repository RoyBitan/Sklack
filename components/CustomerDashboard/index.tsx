import React, { memo, useCallback } from "react";
import LoadingSpinner from "../LoadingSpinner";
import { useCustomerDashboardLogic } from "./hooks/useCustomerDashboardLogic";
import CustomerHeader from "./components/CustomerHeader";
import ProfileCompletionBanner from "./components/ProfileCompletionBanner";
import CustomerVehiclesSection from "./components/CustomerVehiclesSection";
import AddVehicleModal from "./components/AddVehicleModal";
import CheckInModal from "./components/CheckInModal";
import CustomerTasksSection from "./components/CustomerTasksSection";
import CustomerDocumentsSection from "./components/CustomerDocumentsSection";
import RequestFormModal from "./components/RequestFormModal";

/**
 * CustomerDashboard - Main customer view
 * Memoized sections and callbacks for performance optimization
 */
const CustomerDashboard: React.FC = () => {
  const logic = useCustomerDashboardLogic();

  // Memoize navigation callback
  const handleNavigateSettings = useCallback(
    () => logic.navigateTo("SETTINGS"),
    [logic.navigateTo],
  );

  // Memoize modal open callbacks
  const handleOpenAddVehicle = useCallback(
    () => logic.setShowAddVehicle(true),
    [logic.setShowAddVehicle],
  );

  const handleCloseAddVehicle = useCallback(
    () => logic.setShowAddVehicle(false),
    [logic.setShowAddVehicle],
  );

  const handleCloseCheckIn = useCallback(() => {
    logic.setShowCheckIn(null);
    logic.setEditingTaskId(null);
  }, [logic.setShowCheckIn, logic.setEditingTaskId]);

  const handleCloseRequestForm = useCallback(() => {
    logic.setShowRequestForm(null);
    logic.setRequestPhoto(null);
  }, [logic.setShowRequestForm, logic.setRequestPhoto]);

  if (logic.loading || !logic.user) {
    return <LoadingSpinner message="טוען לוח בקרה..." />;
  }

  return (
    <div className="pb-24 space-y-8 animate-fade-in">
      <CustomerHeader
        user={logic.user}
        profile={logic.profile}
        onDisconnect={logic.handleDisconnect}
      />

      <ProfileCompletionBanner
        user={logic.user}
        onNavigateSettings={handleNavigateSettings}
      />

      <CustomerVehiclesSection
        vehicles={logic.myVehicles}
        t={logic.t}
        onAddVehicle={handleOpenAddVehicle}
        onRemoveVehicle={logic.removeVehicle}
        onCheckIn={logic.setShowCheckIn}
      />

      <CustomerTasksSection
        activeTab={logic.activeTab}
        setActiveTab={logic.setActiveTab}
        activeTasks={logic.activeTasks}
        completedTasks={logic.completedTasks}
        hasMoreTasks={logic.hasMoreTasks}
        loading={logic.loading}
        loadMoreTasks={logic.loadMoreTasks}
        garagePhone={logic.garagePhone}
        onShowRequest={logic.setShowRequestForm}
        onCancel={logic.deleteTask}
        onEdit={logic.handleEditTask}
      />

      <CustomerDocumentsSection
        user={logic.user}
        uploadingDoc={logic.uploadingDoc}
        uploadProgress={logic.uploadProgress}
        onUpload={logic.handleDocUpload}
        onDelete={logic.handleDocDelete}
      />

      {/* Modals - Only render when needed */}
      {logic.showAddVehicle && (
        <AddVehicleModal
          showAddVehicle={logic.showAddVehicle}
          onClose={handleCloseAddVehicle}
          onSubmit={logic.handleAddVehicleSubmit}
          newVehicle={logic.newVehicle}
          setNewVehicle={logic.setNewVehicle}
          loadingApi={logic.loadingApi}
          setLoadingApi={logic.setLoadingApi}
          showVehicleSelect={logic.showVehicleSelect}
          setShowVehicleSelect={logic.setShowVehicleSelect}
          scrollRef={logic.addVehicleScrollRef}
        />
      )}

      {logic.showCheckIn && (
        <CheckInModal
          showCheckIn={logic.showCheckIn}
          editingTaskId={logic.editingTaskId}
          checkInForm={logic.checkInForm}
          setCheckInForm={logic.setCheckInForm}
          isSubmitting={logic.isSubmitting}
          onSubmit={logic.handleCheckInSubmit}
          onClose={handleCloseCheckIn}
          scrollRef={logic.checkInScrollRef}
        />
      )}

      {logic.showRequestForm && (
        <RequestFormModal
          showRequestForm={logic.showRequestForm}
          requestText={logic.requestText}
          setRequestText={logic.setRequestText}
          requestPhoto={logic.requestPhoto}
          setRequestPhoto={logic.setRequestPhoto}
          onSubmit={logic.submitCustomerRequest}
          onClose={handleCloseRequestForm}
        />
      )}
    </div>
  );
};

export default memo(CustomerDashboard);
