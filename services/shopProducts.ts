import { supabase } from "@/lib/supabase";

export interface ShopProduct {
  id: string;
  owner_id: string;
  name: string;
  price: number;
  stock_count: number;
  rating: number;
  expiry: string | null; // YYYY-MM-DD
  image_url: string | null;
  created_at?: string;
}

export type ShopProductInput = {
  name: string;
  price: number;
  stock_count: number;
  rating: number;
  expiry: string | null;
  image_url: string | null;
};

export const getShopProducts = async (): Promise<ShopProduct[]> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) return [];
  const { data } = await supabase
    .from("shop_products")
    .select("*")
    .eq("owner_id", user.user.id)
    .order("created_at", { ascending: false });
  return data ?? [];
};

export const addShopProduct = async (
  input: ShopProductInput
): Promise<{ error: any }> => {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user?.id) return { error: "Not authenticated" };
  const { error } = await supabase
    .from("shop_products")
    .insert({ owner_id: user.user.id, ...input });
  return { error };
};

export const updateShopProduct = async (
  id: string,
  input: ShopProductInput
): Promise<{ error: any }> => {
  const { error } = await supabase
    .from("shop_products")
    .update(input)
    .eq("id", id);
  return { error };
};

export const deleteShopProduct = async (id: string): Promise<{ error: any }> => {
  const { error } = await supabase.from("shop_products").delete().eq("id", id);
  return { error };
};
