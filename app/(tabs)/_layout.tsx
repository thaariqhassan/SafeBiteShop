import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const TabIcon = ({
  focused,
  title,
  icon,
}: {
  focused: boolean;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}) => (
  <View style={{ alignItems: "center", justifyContent: "center", width: 64 }}>
    <Ionicons
      name={
        focused ? icon : (`${icon}-outline` as keyof typeof Ionicons.glyphMap)
      }
      size={focused ? 24 : 18}
      color={focused ? "#fde047" : "#ffffff"}
    />
    <Text
      numberOfLines={1}
      style={{
        fontSize: 11,
        marginTop:2,
        fontWeight: focused ? "700" : "500",
        color: focused ? "#fde047" : "#cfe8cf",
      }}
    >
      {title}
    </Text>
  </View>
);
const _layout = () => {
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarItemStyle: {
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
        },
        tabBarStyle: {
          backgroundColor: "#004d00",
          borderRadius: 30,
          position: "absolute",
          height: 55,
          marginHorizontal: 16,
          marginBottom: 24,
          paddingTop: 5,
          borderWidth: 2,
          borderColor: "#fde047",
          borderTopWidth: 2,
          borderTopColor: "#fde047",
          overflow: "hidden",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={"home"} title="Home" />
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="tracker"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={"stats-chart"} title="Tracker" />
          ),
          headerTitle: "Nutrition Tracker",
          headerStyle: { backgroundColor: "#004d00" },
          headerTintColor: "#ffffff",
        }}
      />
      <Tabs.Screen
        name="recipes"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={"restaurant"} title="Recipes" />
          ),
          headerTitle: "Recipes",
          headerStyle: { backgroundColor: "#004d00" },
          headerTintColor: "#ffffff",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={"person"} title="Profile" />
          ),
          headerTitle: "Profile",
          headerStyle: {
            backgroundColor: "#004d00",
          },
          headerTintColor: "#ffffff",
        }}
      />
    </Tabs>
  );
};
export default _layout;
