import React from "react";
import { useOrganizationLogic } from "./hooks/useOrganizationLogic";
import { OrgHeader } from "./components/OrgHeader";
import { StatsCards } from "./components/StatsCards";
import { PendingRequestsList } from "./components/PendingRequestsList";
import { MembersList } from "./components/MembersList";
import { OnboardingView } from "./components/OnboardingView";

interface OrganizationViewProps {
  onboarding?: boolean;
}

const OrganizationView: React.FC<OrganizationViewProps> = ({ onboarding }) => {
  const {
    // Global
    profile,
    signOut,
    isManager,
    promoteToAdmin,

    // State
    expandedMember,
    setExpandedMember,
    orgName,
    setOrgName,
    orgIdToJoin,
    setOrgIdToJoin,
    loading,
    setLoading,
    error,
    setError,
    infoMessage,
    setInfoMessage,
    selectedPath,
    setSelectedPath,
    managerPhone,
    setManagerPhone,
    searchMode,
    setSearchMode,
    formRef,

    // Data
    members,
    pendingRequests,
    invitations,
    invitePhone,
    setInvitePhone,

    // Logic
    handleCreateOrg,
    handleJoinOrg,
    handleInvite,
    handleAcceptInvite,
    handleDeclineInvite,
    handlePhoneSearch,
    copyToClipboard,
    handleMembershipAction,
    orgDisplayName,
  } = useOrganizationLogic({ onboarding });

  if (onboarding) {
    return (
      <OnboardingView
        selectedPath={selectedPath}
        setSelectedPath={setSelectedPath}
        signOut={signOut}
        profile={profile}
        orgName={orgName}
        setOrgName={setOrgName}
        orgIdToJoin={orgIdToJoin}
        setOrgIdToJoin={setOrgIdToJoin}
        loading={loading}
        error={error}
        infoMessage={infoMessage}
        managerPhone={managerPhone}
        setManagerPhone={setManagerPhone}
        searchMode={searchMode}
        setSearchMode={setSearchMode}
        invitations={invitations}
        handleCreateOrg={handleCreateOrg}
        handleJoinOrg={handleJoinOrg}
        handleAcceptInvite={handleAcceptInvite}
        handleDeclineInvite={handleDeclineInvite}
        handlePhoneSearch={handlePhoneSearch}
        formRef={formRef}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-16 py-12 px-8 animate-fade-in-up">
      <OrgHeader isManager={isManager} />

      <StatsCards
        profile={profile}
        membersCount={members.length}
        orgDisplayName={orgDisplayName}
        infoMessage={infoMessage}
        copyToClipboard={copyToClipboard}
      />

      {pendingRequests.length > 0 && isManager && (
        <PendingRequestsList
          pendingRequests={pendingRequests}
          handleMembershipAction={handleMembershipAction}
        />
      )}

      <MembersList
        members={members}
        isManager={isManager}
        expandedMember={expandedMember}
        setExpandedMember={setExpandedMember}
        promoteToAdmin={promoteToAdmin}
        invitePhone={invitePhone}
        setInvitePhone={setInvitePhone}
        handleInvite={handleInvite}
        loading={loading}
      />
    </div>
  );
};

export default OrganizationView;
