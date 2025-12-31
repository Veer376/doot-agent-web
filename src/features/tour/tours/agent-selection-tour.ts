import type { DriveStep, Config } from "driver.js";

/**
 * Tour steps for guiding users on agent selection.
 * This tour is shown to unauthenticated users landing on the website.
 */
export const agentSelectionSteps: DriveStep[] = [
    {
        element: "#agent-selector-segment",
        popover: {
            title: "Select an Agent",
            description: "Click twice to select from agents. First click switches to agent mode, second click opens the agent picker.",
            side: "bottom",
            align: "start",
        },
    },
];

/**
 * Configuration for the agent selection tour.
 */
export const agentTourConfig: Partial<Config> = {
    showProgress: false,
    showButtons: ["next", "close"],
    nextBtnText: "Got it!",
    prevBtnText: "Back",
    doneBtnText: "Done",
    steps: agentSelectionSteps,
};
