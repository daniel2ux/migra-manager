import type { Auth } from "@/supabase/auth-compat";
import { signOut as supabaseSignOut } from "@/supabase/auth-shim";
import { clearAppState } from "@/lib/auth/app-session";

type RouterLike = { push: (url: string) => void };

export async function signOutAndRedirect(auth: Auth, router: RouterLike): Promise<void> {
  await supabaseSignOut(auth);
  clearAppState({ flash: "session_ended" });
  router.push("/login");
}
