import { supabase } from "@/services/supabase";

export async function createParkingSessionVehicleSnapshot({
  parkingSessionId,
  plate,
  brandName,
  modelName,
  categoryName,
  tariff,
}: {
  parkingSessionId: string;
  plate: string;
  brandName: string;
  modelName: string;
  categoryName: string;
  tariff: number;
}) {
  const { error } = await supabase
    .from("parking_session_vehicles")
    .insert({
      parking_session_id: parkingSessionId,
      plate,
      brand_name: brandName,
      model_name: modelName,
      category_name: categoryName,
      tariff,
    });

  if (error) throw error;
}
