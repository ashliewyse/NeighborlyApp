import { fixture } from "./fixture";
export function useAuth() {
  return {
    user: fixture.viewer ? { id: fixture.viewer } : null,
    loading: false,
    accessLoading: false,
    approvalRequired: false,
    refreshAccess: async () => {},
  };
}
