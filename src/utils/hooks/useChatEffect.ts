import { useEffect } from "react";
import { useChat } from "./useChat";
import { useAuth } from "../../context/AuthContext";

export const useChatEffect = (userId?: string, autoRefresh = true) => {
  const {
    loadConversations,
    loadConversation,
    selectRecipient,
    currentRecipient,
  } = useChat();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Initial load of conversations
    if (isAuthenticated) {
      loadConversations(false, true);
    }

    // Set up polling for new messages
    let intervalId: NodeJS.Timeout | null = null;

    if (autoRefresh && isAuthenticated) {
      intervalId = setInterval(() => {
        loadConversations(false, true);

        if (userId && userId === currentRecipient) {
          loadConversation(userId, false);
        }
      }, 15000); // Poll every 15 seconds
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [
    isAuthenticated,
    loadConversations,
    loadConversation,
    userId,
    currentRecipient,
    autoRefresh,
  ]);

  // Effect for setting active conversation
  useEffect(() => {
    if (isAuthenticated && userId && userId !== currentRecipient) {
      selectRecipient(userId);
      loadConversation(userId, false);
    }
  }, [
    isAuthenticated,
    userId,
    currentRecipient,
    selectRecipient,
    loadConversation,
  ]);
};
