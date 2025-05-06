// This layout is for auth pages that don't need the sidebar
import React from "react";
import AuthLayout from "../auth-layout";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AuthLayout>{children}</AuthLayout>;
}
