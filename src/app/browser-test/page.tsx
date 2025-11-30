"use client";

import { useEffect, useRef, useState } from "react";

export default function BrowserTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  const connectBrowser = async () => {
    try {
      setError(null);
      setConnected(false);

      // Create peer connection - local/host candidates only (no STUN)
      const pc = new RTCPeerConnection({
        iceServers: [],
      });
      pcRef.current = pc;

      // Handle tracks
      pc.ontrack = (event) => {
        console.log("Received track:", event.track.kind);
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setConnected(true);
        }
      };

      // Handle connection state
      pc.onconnectionstatechange = () => {
        console.log("Connection state:", pc.connectionState);
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          setConnected(false);
          setError("Connection failed or closed");
        }
      };

      // Handle ICE connection state
      pc.oniceconnectionstatechange = () => {
        console.log("ICE connection state:", pc.iceConnectionState);
      };

      pc.onicegatheringstatechange = () => {
        console.log("ICE gathering state:", pc.iceGatheringState);
      };

      // Add transceiver to receive video
      pc.addTransceiver("video", { direction: "recvonly" });

      // Create offer and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log("Local offer created", {
        type: offer.type,
        sdpLength: offer.sdp?.length,
      });

      // Wait for ICE gathering to complete (non-trickle ICE)
      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === "complete") {
          console.log("ICE gathering already complete");
          resolve();
        } else {
          const checkState = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener("icegatheringstatechange", checkState);
              console.log("ICE gathering completed after event");
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", checkState);
        }
      });

      const localDescription = pc.localDescription;
      if (!localDescription) {
        throw new Error("No localDescription after ICE gathering");
      }

      console.log("Sending offer to backend", {
        type: localDescription.type,
        sdpLength: localDescription.sdp?.length,
      });

      // Send offer to backend with all ICE candidates baked in
      const response = await fetch("http://localhost:5000/offer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sdp: localDescription.sdp,
          type: localDescription.type,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const answer = await response.json();

      console.log("Received answer from backend", {
        type: answer.type,
        sdpLength: answer.sdp?.length,
      });

      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      console.log("WebRTC connection established");
    } catch (err) {
      console.error("Connection error:", err);
      setError(err instanceof Error ? err.message : "Connection failed");
      setConnected(false);
    }
  };

  const disconnectBrowser = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setConnected(false);
  };

  useEffect(() => {
    return () => {
      disconnectBrowser();
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 dark:bg-gray-900">
      <div className="w-full max-w-6xl space-y-6">
        <div className="text-center">
          <h1 className="mb-2 text-3xl font-bold">Browser Streaming Test</h1>
          <p className="text-gray-600 dark:text-gray-400">
            WebRTC browser streaming with local Chrome
          </p>
        </div>

        <div className="flex justify-center gap-4">
          {!connected ? (
            <button
              onClick={connectBrowser}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
            >
              Connect Browser
            </button>
          ) : (
            <button
              onClick={disconnectBrowser}
              className="rounded-lg bg-red-600 px-6 py-3 font-medium text-white transition-colors hover:bg-red-700"
            >
              Disconnect
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-400 bg-red-100 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {connected && (
          <div className="rounded-lg border border-green-400 bg-green-100 p-2 text-center text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            <p className="font-medium">✓ Connected</p>
          </div>
        )}

        <div className="rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg bg-black"
            style={{ aspectRatio: "16/9" }}
          />
        </div>

        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>
            <strong>Status:</strong> {connected ? "Connected" : "Disconnected"}
          </p>
          <p>
            <strong>Backend:</strong> http://localhost:5000
          </p>
          <p className="text-xs">
            Make sure the backend is running:{" "}
            <code>uv run python packages/browser/webrtc_test.py</code>
          </p>
        </div>
      </div>
    </div>
  );
}
