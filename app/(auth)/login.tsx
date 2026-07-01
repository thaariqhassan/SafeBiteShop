import { signin } from "@/lib/auth";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export const SText = ({ className = "", ...props }) => {
  return <Text className={`text-[#0D0D0D] ${className}`} {...props} />;
};

export const InputWithLabel = ({
  name,
  value,
  change,
  secure = false,
}: {
  name: string;
  value: string;
  change: (e: string) => void;
  secure?: boolean;
}) => {
  const [show, setShow] = useState(false);
  return (
    <View>
      <SText className="text-xl">{name}</SText>
      <View className="flex-row items-center bg-gray-100 rounded-sm">
        <TextInput
          placeholder={"Your " + name.toLowerCase()}
          className="flex-1 px-3 h-10"
          value={value}
          onChangeText={(e) => {
            change(e);
          }}
          secureTextEntry={secure && !show}
          autoCapitalize={secure ? "none" : undefined}
          autoCorrect={secure ? false : undefined}
        />
        {secure && (
          <TouchableOpacity
            onPress={() => setShow((prev) => !prev)}
            className="px-3 h-10 justify-center"
            hitSlop={8}
          >
            <Ionicons
              name={show ? "eye-off" : "eye"}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

function login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  async function handleLogin() {
    setError("");
    setLoading(true);
    const { error } = await signin(email, password);
    if (error) {
      setError(error.message);
    } else {
      router.replace("/onboarding");
    }
    setLoading(false);
  }

  return (
    <View className="flex-1 justify-center items-center bg-gray-200">
      <View className="bg-white p-8 gap-8 w-[80%] rounded-lg shadow-lg">
        <SText className="text-5xl font-semibold m-6 text-center">Login</SText>
        <InputWithLabel name="Email" value={email} change={setEmail} />
        <InputWithLabel
          name="Password"
          value={password}
          change={setPassword}
          secure
        />
        {error && <SText className="text-red-600">{error}</SText>}
        <TouchableOpacity
          onPress={handleLogin}
          className="bg-green-700 text-center h-8 justify-center p-1 rounded-md"
          disabled={loading}
        >
          {!loading && (
            <Text className="text-white text-lg font-bold text-center">
              Login
            </Text>
          )}
          {loading && <ActivityIndicator size={20} color={"white"} />}
        </TouchableOpacity>
        <SText>
          Don't have an account?Create a new one:{" "}
          <Link href={"/signup"} className="text-blue-500">
            Sign Up
          </Link>
        </SText>
      </View>
    </View>
  );
}

export default login;
