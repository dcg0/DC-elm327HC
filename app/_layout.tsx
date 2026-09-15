import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "@/lib/theme-provider";
import { ObdProvider } from "@/hooks/use-elm327";

export default function RootLayout() {
  return <ThemeProvider><ObdProvider><StatusBar style="light" /><Stack screenOptions={{ headerShown: false }} /></ObdProvider></ThemeProvider>;
}
