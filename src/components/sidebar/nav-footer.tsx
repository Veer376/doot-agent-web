"use client";

import { useState } from "react";
import {
  UserIconHuge,
  LoaderIcon,
  TriangleAlertIcon,
} from "@/components/icons";
import { useTheme } from "next-themes";
import {
  ToggleIcon,
  SettingsIcon,
  DarkThemeIcon,
  LightThemeIcon,
  SystemThemeIcon,
  LogOutIcon,
  type IconSize,
} from "@/components/icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuthContext } from "@/providers/Auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfigStore } from "@/features/chat/hooks/use-config-store";

// Default icon size for this file
const DEFAULT_ICON_SIZE: IconSize = "sm";

export function NavFooter() {
  const { isMobile } = useSidebar();
  const { user: authUser, signOut, isAuthenticated } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { resetStore } = useConfigStore();

  // Use auth user if available, otherwise use default user
  const displayUser = authUser
    ? {
        name:
          authUser.firstName ||
          authUser.displayName?.split(" ")[0] ||
          authUser.email?.split("@")[0] ||
          "User",
        email: authUser.email || "",
        avatar: authUser.avatarUrl || "",
        firstName: authUser.firstName || "",
        lastName: authUser.lastName || "",
      }
    : {
        name: "Guest",
        email: "Not signed in",
        avatar: "",
        firstName: "",
        lastName: "",
      };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      const { error } = await signOut();

      if (error) {
        console.error("Error signing out:", error);
        toast.error("Error signing out", { richColors: true });
        return;
      }

      router.push("/signin");
    } catch (err) {
      console.error("Error during sign out:", err);
      toast.error("Error signing out", { richColors: true });
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSignIn = () => {
    router.push("/signin");
  };

  const handleClearLocalData = () => {
    resetStore();
    toast.success("Local data cleared. Please refresh the page.", {
      richColors: true,
    });
  };

  const isProdEnv = process.env.NODE_ENV === "production";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-12 cursor-pointer group-data-[collapsible=icon]:p-0!"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={displayUser.avatar}
                  alt={displayUser.name}
                />
                <AvatarFallback>
                  {displayUser.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {displayUser.name}
                </span>
                <span className="truncate text-xs">{displayUser.email}</span>
              </div>
              <ToggleIcon
                size={DEFAULT_ICON_SIZE}
                isExpanded={isDropdownOpen}
              />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          {/*nav-user-dropdown*/}
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={1}
            alignOffset={80}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={displayUser.avatar}
                    alt={displayUser.name}
                  />
                  <AvatarFallback>
                    {displayUser.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {displayUser.name}
                  </span>
                  <span className="truncate text-xs">{displayUser.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Theme Selection */}
            <DropdownMenuLabel className="text-muted-foreground px-2 py-1.5 text-xs">
              Theme
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setTheme("light")}
              className="cursor-pointer"
            >
              <LightThemeIcon size={DEFAULT_ICON_SIZE} />
              <span>Light</span>
              {theme === "light" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("dark")}
              className="cursor-pointer"
            >
              <DarkThemeIcon size={DEFAULT_ICON_SIZE} />
              <span>Dark</span>
              {theme === "dark" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("system")}
              className="cursor-pointer"
            >
              <SystemThemeIcon size={DEFAULT_ICON_SIZE} />
              <span>System</span>
              {theme === "system" && <span className="ml-auto text-xs">✓</span>}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <SettingsIcon size={DEFAULT_ICON_SIZE} />
              Settings
            </DropdownMenuItem>

            {isAuthenticated ? (
              <DropdownMenuItem
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? (
                  <>
                    <LoaderIcon className="mr-2 h-4 w-4" />
                    Logging out...
                  </>
                ) : (
                  <>
                    <LogOutIcon size={DEFAULT_ICON_SIZE} />
                    Log out
                  </>
                )}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleSignIn}>
                <UserIconHuge className="mr-2 h-4 w-4" />
                Sign in
              </DropdownMenuItem>
            )}
            {!isProdEnv && (
              <DropdownMenuItem onClick={handleClearLocalData}>
                <TriangleAlertIcon className="mr-2 h-4 w-4 text-red-500" />
                Clear local data
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
