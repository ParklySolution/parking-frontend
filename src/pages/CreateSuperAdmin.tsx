import { supabase } from "@/services/supabase";

export default function CreateSuperAdmin() {
  async function create() {
    const { data, error } = await supabase.auth.signUp({
      email: "garagesolution25@gmail.com",
      password: "Tokio26!",
      options: {
        data: {
          role: "super_admin"
        }
      }
    });

    console.log("CREATED:", data, error);
  }

  return (
    <div style={{ padding: 40 }}>
      <h1>Crea Super Admin</h1>
      <button onClick={create}>Crea ora</button>
    </div>
  );
}
