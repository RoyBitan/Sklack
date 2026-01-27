import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { SubscriptionTier, TaskStatus } from "../types";
import { useMemo } from "react";

export const useSubscription = () => {
  const { profile } = useAuth();
  const { tasks } = useData();

  const organization = profile?.organization;
  const isPremium =
    organization?.subscription_tier === SubscriptionTier.PREMIUM;

  const activeTasksCount = useMemo(() => {
    return tasks.filter((t) =>
      t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED
    ).length;
  }, [tasks]);

  const canAddMoreTasks = isPremium || activeTasksCount < 5;
  const canUseDocuments = isPremium;
  const canUseChat = isPremium;

  const trialDaysLeft = useMemo(() => {
    if (!organization?.created_at) return 0;
    const created = new Date(organization.created_at);
    const trialEnd = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
    const today = new Date();
    const diff = trialEnd.getTime() - today.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [organization?.created_at]);

  const isTrialActive = trialDaysLeft > 0;

  return {
    isPremium,
    isTrialActive,
    trialDaysLeft,
    canAddMoreTasks,
    canUseDocuments,
    canUseChat,
    activeTasksCount,
    tier: organization?.subscription_tier || SubscriptionTier.FREE,
  };
};
