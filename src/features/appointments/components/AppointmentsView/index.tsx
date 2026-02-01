import React from "react";
import AppointmentsHeader from "./components/AppointmentsHeader";
import PendingRequestsSection from "./components/PendingRequestsSection";
import CalendarGrid from "./components/CalendarGrid";
import CustomerBookView from "./components/CustomerBookView";
import AppointmentModal from "./components/AppointmentModal";
import ReminderModal from "./components/ReminderModal";
import RescheduleModal from "./components/RescheduleModal";
import { useAppointmentsLogic } from "./hooks/useAppointmentsLogic";

const AppointmentsView: React.FC = () => {
  const {
    // State
    isManager,
    viewDate,
    setViewDate,
    selectedDate,
    setSelectedDate,
    mileage,
    setMileage,
    selectedTime,
    setSelectedTime,
    selectedService,
    setSelectedService,
    loading,
    loadingApi,
    showModal,
    setShowModal,
    editingId, // Add to hook manually if missed or export from hook
    reschedulingTask,
    setReschedulingTask,
    showReminderOptions,
    setShowReminderOptions,
    rescheduleData,
    setRescheduleData,
    bookingData,
    setBookingData,

    // Data
    appointments,
    tasks,
    pendingRequests,
    WORKING_HOURS,
    weekDays,

    // Actions
    navigateWeek,
    navigateMonth,
    goToToday,
    isToday,
    formatDateForDB,
    handleAutoFill,
    handleManagerBook,
    handleBook,
    handleDelete,
    handleEdit,
    handleSlotClick,
    refreshData,
    approveTask,
    approveAppointment,
    updateTask,
    navigateTo,
    setSelectedTaskId,
  } = useAppointmentsLogic();

  return (
    <div className="animate-fade-in-up selection:bg-black selection:text-white">
      {isManager
        ? (
          <div className="space-y-8">
            <AppointmentsHeader
              weekDays={weekDays}
              navigateWeek={navigateWeek}
            />

            <PendingRequestsSection
              pendingRequests={pendingRequests}
              handleEdit={handleEdit}
              setRescheduleData={setRescheduleData}
              approveAppointment={approveAppointment}
              refreshData={refreshData}
            />

            <CalendarGrid
              WORKING_HOURS={WORKING_HOURS}
              weekDays={weekDays}
              isToday={isToday}
              formatDateForDB={formatDateForDB}
              appointments={appointments}
              tasks={tasks}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              navigateTask={(id) => {
                setSelectedTaskId(id);
                navigateTo("TASK_DETAIL");
              }}
              handleSlotClick={handleSlotClick}
              setSelectedDate={setSelectedDate}
            />

            {/* Legend */}
            <div className="flex flex-wrap gap-8 px-4 pb-12">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-white border-2 border-black shadow-sm">
                </div>
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  תור רגיל
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-purple-600 shadow-sm">
                </div>
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  משימה מאושרת
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-blue-600 shadow-sm">
                </div>
                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">
                  היום
                </span>
              </div>
            </div>
          </div>
        )
        : (
          <CustomerBookView
            selectedService={selectedService}
            setSelectedService={setSelectedService}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            selectedTime={selectedTime}
            setSelectedTime={setSelectedTime}
            mileage={mileage}
            setMileage={setMileage}
            loading={loading}
            handleBook={handleBook}
            WORKING_HOURS={WORKING_HOURS}
          />
        )}

      {/* Modals */}
      <AppointmentModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isManager={isManager}
        editingId={editingId}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        bookingData={bookingData}
        setBookingData={setBookingData}
        selectedService={selectedService}
        setSelectedService={setSelectedService}
        handleAutoFill={handleAutoFill}
        loadingApi={loadingApi}
        handleManagerBook={handleManagerBook}
        handleBook={handleBook}
      />

      <ReminderModal
        showReminderOptions={showReminderOptions}
        setShowReminderOptions={setShowReminderOptions}
        approveTask={approveTask}
      />

      <RescheduleModal
        reschedulingTask={reschedulingTask}
        setReschedulingTask={setReschedulingTask}
        rescheduleData={rescheduleData}
        setRescheduleData={setRescheduleData}
        updateTask={updateTask}
      />
    </div>
  );
};

export default AppointmentsView;
