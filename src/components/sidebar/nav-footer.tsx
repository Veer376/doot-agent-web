"use client";

import { useState } from "react";
import {
  UserIconHuge,
  LoaderIcon,
  TriangleAlertIcon,
  CheckIcon,
} from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { config } from "@/config";

// Default icon size for this file
const DEFAULT_ICON_SIZE: IconSize = "sm";

export function NavFooter() {
  const { isMobile } = useSidebar();
  const { user: authUser, signOut, isAuthenticated } = useAuthContext();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
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
        email: "@guest",
        avatar: "",
        firstName: "",
        lastName: "",
      };

  const performSignOut = async () => {
    try {
      setIsSigningOut(true);
      const { error } = await signOut();

      if (error) {
        toast.error("Error signing out");
        return;
      }

      resetStore();
      toast.success("Signed out successfully");
      setShowLogoutDialog(false);
      router.push("/");
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSignIn = () => {
    // Use auth param to open dialog instead of navigating to separate page
    router.push("/?auth=signin");
  };

  const handleClearLocalData = () => {
    resetStore();
    toast.success("Local data cleared. Please refresh the page.", {
      richColors: true,
    });
  };

  const isProdEnv = config.isProd;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-12 cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!h-12 group-data-[collapsible=icon]:!w-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:[&>*:not(:first-child)]:hidden"
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
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
            <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground">
              Theme
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setTheme("light")}
              className="cursor-pointer"
            >
              <LightThemeIcon size={DEFAULT_ICON_SIZE} />
              <span>Light</span>
              {theme === "light" && (
                <CheckIcon
                  size="xs"
                  className="ml-auto"
                  aria-hidden="true"
                />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("dark")}
              className="cursor-pointer"
            >
              <DarkThemeIcon size={DEFAULT_ICON_SIZE} />
              <span>Dark</span>
              {theme === "dark" && (
                <CheckIcon
                  size="xs"
                  className="ml-auto"
                  aria-hidden="true"
                />
              )}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setTheme("system")}
              className="cursor-pointer"
            >
              <SystemThemeIcon size={DEFAULT_ICON_SIZE} />
              <span>System</span>
              {theme === "system" && (
                <CheckIcon
                  size="xs"
                  className="ml-auto"
                  aria-hidden="true"
                />
              )}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <SettingsIcon size={DEFAULT_ICON_SIZE} />
              Settings
            </DropdownMenuItem>

            {isAuthenticated ? (
              <DropdownMenuItem onClick={() => setShowLogoutDialog(true)}>
                <LogOutIcon size={DEFAULT_ICON_SIZE} />
                Log out
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleSignIn}>
                <UserIconHuge className="mr-2 h-4 w-4" />
                Sign in
              </DropdownMenuItem>
            )}
            {!isProdEnv && (
              <DropdownMenuItem onClick={handleClearLocalData}>
                <TriangleAlertIcon className="mr-2 h-4 w-4 text-destructive" />
                Clear local data
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      <Dialog
        open={showLogoutDialog}
        onOpenChange={setShowLogoutDialog}
      >
        <DialogContent
          className="gap-6 p-6 sm:max-w-88"
          data-radius="overlay"
        >
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-center text-xl font-semibold">
              Are you sure you want to log out?
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Log out as {displayUser.email}?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Button
              onClick={performSignOut}
              data-radius="control"
              className="h-11 bg-foreground text-background hover:bg-foreground/90"
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <>
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                "Log out"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowLogoutDialog(false)}
              data-radius="control"
              className="h-11 w-full border-border"
              disabled={isSigningOut}
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarMenu>
  );
}
