import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Image, Text, View } from "react-native";
import sb from "@/assets/images/sb.png";
import { supabase } from "@/lib/supabase";

export default function Index() {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      timer = setTimeout(() => {
        if (user) {
          router.replace("/home");
        } else {
          router.replace("/login");
        }
      }, 2000);
    };
    checkUser();
    return () => clearTimeout(timer);
  }, []);
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Image source={sb} className="w-[300px] h-[230px]" resizeMode="contain" />
    </View>
  );
}
