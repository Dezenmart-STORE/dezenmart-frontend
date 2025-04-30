import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "./redux";
import {
  getUserById,
  getUserByEmail,
  getAllUsers,
  deleteUserProfile,
  clearSelectedUser,
  fetchUserProfile,
} from "../../store/slices/userSlice";
import {
  selectAllUsers,
  selectSelectedUser,
  selectUserLoading,
  selectUserError,
  selectFormattedSelectedUser,
} from "../../store/selectors/userSelectors";
import { useSnackbar } from "../../context/SnackbarContext";

export const useUserManagement = () => {
  const dispatch = useAppDispatch();
  const { showSnackbar } = useSnackbar();

  const users = useAppSelector(selectAllUsers);
  const selectedUser = useAppSelector(selectSelectedUser);
  const formattedSelectedUser = useAppSelector(selectFormattedSelectedUser);
  const loading = useAppSelector(selectUserLoading);
  const error = useAppSelector(selectUserError);

  const fetchProfile = useCallback(
    async (showNotifications = true, forceRefresh = false) => {
      try {
        await dispatch(fetchUserProfile(forceRefresh)).unwrap();
        if (showNotifications) {
          showSnackbar("Profile loaded successfully", "success");
        }
        return true;
      } catch (err) {
        if (showNotifications) {
          showSnackbar((err as string) || "Failed to load profile", "error");
        }
        return false;
      }
    },
    [dispatch, showSnackbar]
  );

  const fetchUserById = useCallback(
    async (userId: string, showNotifications = true) => {
      try {
        await dispatch(getUserById(userId)).unwrap();
        if (showNotifications) {
          showSnackbar("User details loaded successfully", "success");
        }
        return true;
      } catch (err) {
        if (showNotifications) {
          showSnackbar((err as string) || "Failed to load user", "error");
        }
        return false;
      }
    },
    [dispatch, showSnackbar]
  );

  const fetchUserByEmail = useCallback(
    async (email: string, showNotifications = true) => {
      try {
        await dispatch(getUserByEmail(email)).unwrap();
        if (showNotifications) {
          showSnackbar("User details loaded successfully", "success");
        }
        return true;
      } catch (err) {
        if (showNotifications) {
          showSnackbar((err as string) || "Failed to load user", "error");
        }
        return false;
      }
    },
    [dispatch, showSnackbar]
  );

  const fetchAllUsers = useCallback(
    async (showNotifications = true, forceRefresh = false) => {
      try {
        await dispatch(getAllUsers(forceRefresh)).unwrap();
        if (showNotifications) {
          showSnackbar("Users loaded successfully", "success");
        }
        return true;
      } catch (err) {
        if (showNotifications) {
          showSnackbar((err as string) || "Failed to load users", "error");
        }
        return false;
      }
    },
    [dispatch, showSnackbar]
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      try {
        await dispatch(deleteUserProfile(userId)).unwrap();
        showSnackbar("User deleted successfully", "success");
        return true;
      } catch (err) {
        showSnackbar((err as string) || "Failed to delete user", "error");
        return false;
      }
    },
    [dispatch, showSnackbar]
  );

  const resetSelectedUser = useCallback(() => {
    dispatch(clearSelectedUser());
  }, [dispatch]);

  return {
    users,
    selectedUser,
    formattedSelectedUser,
    isLoading: loading === "pending",
    error,
    fetchProfile,
    fetchUserById,
    fetchUserByEmail,
    fetchAllUsers,
    deleteUser,
    resetSelectedUser,
    isError: loading === "failed" && error !== null,
    isSuccess: loading === "succeeded",
  };
};
