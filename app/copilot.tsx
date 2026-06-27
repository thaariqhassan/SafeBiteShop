import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { askCopilot, ChatMessage } from "@/services/copilot";
import { getActiveProfile } from "@/services/familyProfile";
import { speak, stopSpeaking } from "@/services/speech";

const SUGGESTIONS = [
  "What should I avoid eating today?",
  "Can I eat the products I scanned recently?",
  "Suggest a safe snack for me",
  "Any food–drug interactions I should know?",
];

const Copilot = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [advisingName, setAdvisingName] = useState("");
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    getActiveProfile().then((p) => setAdvisingName(p.name));
  }, []);

  // Stop narration when leaving the screen.
  useEffect(() => () => stopSpeaking(), []);

  const toggleSpeak = (idx: number, text: string) => {
    if (speakingIdx === idx) {
      stopSpeaking();
      setSpeakingIdx(null);
      return;
    }
    speak(text, {
      onStart: () => setSpeakingIdx(idx),
      onDone: () => setSpeakingIdx(null),
    });
  };

  useEffect(() => {
    // Keep the latest message in view.
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    return () => clearTimeout(t);
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    const { reply, error } = await askCopilot(next);
    setLoading(false);
    setMessages([
      ...next,
      {
        role: "assistant",
        content:
          reply ||
          `Sorry, I couldn't answer that${error ? ` (${error})` : ""}. Please try again.`,
      },
    ]);
  };

  const isEmpty = messages.length === 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f9fafb" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Sub-header: who the co-pilot is advising */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#ecfdf5",
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: "#d1fae5",
        }}
      >
        <Ionicons name="sparkles" size={14} color="#15803d" />
        <Text style={{ color: "#166534", fontSize: 12, marginLeft: 6, fontWeight: "600" }}>
          Advising {advisingName || "you"} · grounded in your health profile
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {isEmpty ? (
          <View style={{ alignItems: "center", marginTop: 30 }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: "#dcfce7",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons name="chatbubbles" size={30} color="#15803d" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#111827" }}>
              SafeBite Co-pilot
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: "#6b7280",
                textAlign: "center",
                marginTop: 6,
                lineHeight: 19,
                paddingHorizontal: 10,
              }}
            >
              Ask me anything about what's safe for your allergies, conditions, and
              medications.
            </Text>

            <View style={{ marginTop: 22, width: "100%" }}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => send(s)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#fff",
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    marginBottom: 10,
                  }}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#15803d" />
                  <Text style={{ color: "#374151", fontSize: 14, marginLeft: 10, flex: 1 }}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          messages.map((m, i) => (
            <View
              key={i}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                backgroundColor: m.role === "user" ? "#15803d" : "#ffffff",
                borderWidth: m.role === "user" ? 0 : 1,
                borderColor: "#e5e7eb",
                borderRadius: 16,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginBottom: 10,
                maxWidth: "86%",
              }}
            >
              <Text
                style={{
                  color: m.role === "user" ? "#ffffff" : "#111827",
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {m.content}
              </Text>
              {m.role === "assistant" ? (
                <TouchableOpacity
                  onPress={() => toggleSpeak(i, m.content)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    speakingIdx === i ? "Stop reading aloud" : "Read this answer aloud"
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 8,
                    alignSelf: "flex-start",
                  }}
                >
                  <Ionicons
                    name={speakingIdx === i ? "stop-circle" : "volume-high"}
                    size={15}
                    color={speakingIdx === i ? "#dc2626" : "#15803d"}
                  />
                  <Text
                    style={{
                      marginLeft: 5,
                      fontSize: 12,
                      fontWeight: "600",
                      color: speakingIdx === i ? "#dc2626" : "#15803d",
                    }}
                  >
                    {speakingIdx === i ? "Stop" : "Listen"}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))
        )}

        {loading ? (
          <View
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#ffffff",
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <ActivityIndicator size="small" color="#15803d" />
            <Text style={{ color: "#6b7280", fontSize: 13, marginLeft: 8 }}>
              Thinking…
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Input bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          backgroundColor: "#ffffff",
        }}
      >
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Ask the co-pilot…"
          placeholderTextColor="#9ca3af"
          multiline
          style={{
            flex: 1,
            maxHeight: 120,
            backgroundColor: "#f3f4f6",
            borderRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 10,
            fontSize: 14,
            color: "#111827",
            marginRight: 8,
          }}
        />
        <TouchableOpacity
          onPress={() => send(input)}
          disabled={!input.trim() || loading}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: !input.trim() || loading ? "#a7f3d0" : "#15803d",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="send" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default Copilot;
