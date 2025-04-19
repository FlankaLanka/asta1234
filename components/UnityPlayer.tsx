"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
} from "react";

interface UnityInstance {
  SetFullscreen: (fullscreenValue: number) => void;
  Quit: () => Promise<void>;
  SendMessage: (objName: string, methName: string, val?: any) => void;
}

interface UnityPlayerProps {
  title?: string;
  buildPath?: string;
  buildFileName?: string;
  productName?: string;
  companyName?: string;
  width?: number;
  height?: number;
  version?: string;
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  onInitialized?: (unityInstance: UnityInstance) => void;
  onError?: (errorMessage: string) => void;
  onProgress?: (progressValue: number) => void;
  theme?: string;
  debugLevel?: "none" | "error" | "warning" | "info";
}

interface UnityPlayerRef {
  instance: UnityInstance | null;
  initialize: () => Promise<UnityInstance | null>;
  reset: () => void;
  sendMessage: (objName: string, methName: string, val?: any) => void;
  setFullscreen: (isFullscreen: boolean) => void;
}

declare global {
  interface Window {
    createUnityInstance: (
      canvasElement: HTMLCanvasElement,
      configObject: Record<string, unknown>,
      progressHandler: (progressValue: number) => void,
    ) => Promise<UnityInstance>;
    WebGLRenderingContext: any;
  }
}

const UnityPlayer = forwardRef<UnityPlayerRef, UnityPlayerProps>(
  (props, ref) => {
    const {
      title = "Unity WebGL Player",
      buildPath = "Build",
      buildFileName = "UnityBuild",
      productName = "Unity Product",
      companyName = "Unity Developer",
      width = 960,
      height = 450,
      version = "1.0",
      responsive = false,
      maintainAspectRatio = true,
      onInitialized,
      onError,
      onProgress,
      theme = "light",
      debugLevel = "error",
    } = props;

    // Refs & State
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isMounted = useRef<boolean>(true);
    const initialized = useRef<boolean>(false);
    const [instance, setInstance] = useState<UnityInstance | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [progress, setProgress] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);

    // Log utility
    const log = useCallback(
      (type: "log" | "warn" | "error", msg: string, data?: unknown) => {
        if (
          (type === "log" && debugLevel === "info") ||
          (type === "warn" && ["info", "warning"].includes(debugLevel)) ||
          (type === "error" && debugLevel !== "none")
        ) {
          console[type](`[Unity] ${msg}`, data || "");
        }
      },
      [debugLevel],
    );

    // Load Unity script
    const loadScript = useCallback(async () => {
      const src = `${buildPath}/${buildFileName}.loader.js`;
      const existing = document.querySelector(
        `script[src="${src}"]`,
      ) as HTMLScriptElement | null;

      if (existing) {
        return new Promise<void>((resolve) => {
          const check = (): void => {
            if (window.createUnityInstance) resolve();
            else setTimeout(check, 100);
          };
          check();
        });
      }

      return new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => {
          const check = (): void => {
            if (window.createUnityInstance) resolve();
            else setTimeout(check, 100);
          };
          check();
        };
        script.onerror = () => reject(new Error("Failed to load Unity loader"));
        document.body.appendChild(script);
      });
    }, [buildPath, buildFileName]);

    // Initialize Unity
    const initUnity = useCallback(async (): Promise<UnityInstance | null> => {
      if (!canvasRef.current || !isMounted.current) return null;

      try {
        canvasRef.current.style.display = "none";
        await loadScript();
        if (!isMounted.current) return null;

        const unityInstance = await window.createUnityInstance(
          canvasRef.current,
          {
            dataUrl: `${buildPath}/${buildFileName}.data`,
            frameworkUrl: `${buildPath}/${buildFileName}.framework.js`,
            codeUrl: `${buildPath}/${buildFileName}.wasm`,
            streamingAssetsUrl: "StreamingAssets",
            companyName,
            productName,
            productVersion: version,
            showBanner: (message: string, type?: string) => {
              if (type === "error") onError?.(message);
              else log("warn", message);
            },
            devicePixelRatio: window.devicePixelRatio || 1,
            matchWebGLToCanvasSize: true,
          },
          (value: number) => {
            setProgress(value);
            onProgress?.(value);
          },
        );

        try {
          unityInstance.SendMessage("GameManager", "OnWebGLLoaded");
        } catch (err) {
          /* Expected */
        }

        canvasRef.current.style.display = "";
        canvasRef.current.focus();

        setInstance(unityInstance);
        setIsLoading(false);
        onInitialized?.(unityInstance);
        return unityInstance;
      } catch (err) {
        if (canvasRef.current) canvasRef.current.style.display = "";
        log("error", "Unity initialization failed", err);
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        onError?.(errorMsg);
        setIsLoading(false);
        return null;
      }
    }, [
      buildPath,
      buildFileName,
      companyName,
      productName,
      version,
      loadScript,
      log,
      onInitialized,
      onProgress,
      onError,
    ]);

    // Restart Unity
    const restart = useCallback(() => {
      if (instance) {
        try {
          instance.Quit().catch((e) => log("warn", "Cleanup error:", e));
        } catch (err) {
          log("warn", "Error quitting Unity:", err);
        }
      }

      setInstance(null);
      setIsLoading(true);
      setProgress(0);
      setError(null);

      if (canvasRef.current) canvasRef.current.style.display = "none";

      try {
        const src = `${buildPath}/${buildFileName}.loader.js`;
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing?.parentNode) existing.parentNode.removeChild(existing);
      } catch (err) {
        log("warn", "Error removing script:", err);
      }

      setTimeout(() => {
        if (isMounted.current)
          initUnity().catch((err: unknown) =>
            log("error", "Restart failed:", err),
          );
      }, 500);
    }, [instance, buildPath, buildFileName, initUnity, log]);

    // Update canvas size
    const updateSize = useCallback(() => {
      if (!responsive || !containerRef.current || !canvasRef.current) return;

      const containerWidth = containerRef.current.clientWidth;
      const newHeight = maintainAspectRatio
        ? containerWidth * (height / width)
        : containerWidth;

      canvasRef.current.style.width = `${containerWidth}px`;
      canvasRef.current.style.height = `${newHeight}px`;
    }, [responsive, maintainAspectRatio, width, height]);

    // Main effect
    useEffect(() => {
      isMounted.current = true;

      // Initialize Unity once
      if (!initialized.current && typeof window !== "undefined") {
        if (!window.WebGLRenderingContext) {
          setError("WebGL is not supported in your browser");
          setIsLoading(false);
        } else {
          initialized.current = true;
          initUnity().catch((err) => log("error", "Init error:", err));
        }
      }

      // Mobile viewport
      let metaTag: HTMLMetaElement | null = null;
      if (
        typeof window !== "undefined" &&
        /iPhone|iPad|iPod|Android/i.test(navigator?.userAgent || "") &&
        !document.querySelector('meta[name="viewport"]')
      ) {
        metaTag = document.createElement("meta");
        metaTag.name = "viewport";
        metaTag.content =
          "width=device-width, initial-scale=1.0, user-scalable=no";
        document.head.appendChild(metaTag);
      }

      // Handle responsive sizing
      if (responsive && typeof window !== "undefined") {
        updateSize();
        window.addEventListener("resize", updateSize);
      }

      // Unity interaction handler
      const handleInteraction = () => {
        if (instance && canvasRef.current) {
          canvasRef.current.focus();
          try {
            instance.SendMessage("GameManager", "OnFocus");
          } catch (err) {
            /* Expected */
          }
          try {
            instance.SendMessage("WebGLBridge", "OnWebGLInteraction");
          } catch (err) {
            /* Expected */
          }
        }
      };

      if (instance && canvasRef.current) {
        canvasRef.current.addEventListener("click", handleInteraction);
        canvasRef.current.addEventListener("touchstart", handleInteraction);
        canvasRef.current.addEventListener("keydown", handleInteraction);
      }

      // Cleanup
      return () => {
        isMounted.current = false;

        if (instance) {
          try {
            instance.Quit().catch((e) => log("warn", "Cleanup error:", e));
          } catch (err) {
            log("warn", "Error quitting Unity:", err);
          }
        }

        if (metaTag?.parentNode) metaTag.parentNode.removeChild(metaTag);

        if (responsive && typeof window !== "undefined") {
          window.removeEventListener("resize", updateSize);
        }

        if (canvasRef.current) {
          canvasRef.current.removeEventListener("click", handleInteraction);
          canvasRef.current.removeEventListener(
            "touchstart",
            handleInteraction,
          );
          canvasRef.current.removeEventListener("keydown", handleInteraction);
        }
      };
    }, [instance, responsive, updateSize, initUnity, log]);

    // Set non-responsive canvas size
    useEffect(() => {
      if (canvasRef.current && !responsive) {
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;
      }
    }, [width, height, responsive]);

    // Expose API
    React.useImperativeHandle(
      ref,
      () => ({
        instance,
        initialize: initUnity,
        reset: restart,
        sendMessage: (objName: string, methName: string, val?: any) => {
          if (instance) instance.SendMessage(objName, methName, val);
        },
        setFullscreen: (isFullscreen: boolean) => {
          if (instance) instance.SetFullscreen(isFullscreen ? 1 : 0);
        },
      }),
      [instance, initUnity, restart],
    );

    // Render
    return (
      <div
        className="card w-full bg-base-100 shadow-xl overflow-hidden"
        ref={containerRef}
        data-theme={theme}
      >
        {!isLoading && (
          <div className="navbar bg-base-200 px-4 py-2 rounded-t-lg">
            <div className="text-lg font-medium">{title}</div>
            <div className="flex-1"></div>
            <div>
              <button
                className="btn btn-ghost btn-circle mr-2"
                onClick={restart}
                aria-label="Restart"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <button
                className="btn btn-ghost btn-circle"
                onClick={() => instance?.SetFullscreen(1)}
                aria-label="Fullscreen"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="p-0">
          {isLoading && (
            <div className="bg-base-100 shadow-xl max-w-md mx-auto my-8 p-4">
              <h2 className="text-xl font-bold mb-4">Loading {title}</h2>
              <div className="w-full bg-base-200 rounded-full h-2.5 mb-1">
                <div
                  className="bg-primary h-2.5 rounded-full transition-all"
                  style={{
                    width: `${Math.max(1, Math.round(progress * 100))}%`,
                  }}
                ></div>
              </div>
              <div className="text-xs text-right">
                {Math.round(progress * 100)}%
              </div>
            </div>
          )}

          {error && (
            <div className="alert alert-error my-4 mx-4" role="alert">
              <div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>Error: {error}</span>
              </div>
              <button onClick={() => setError(null)} className="btn btn-sm">
                ×
              </button>
            </div>
          )}

          <canvas
            id="unity-canvas"
            className="unity-canvas w-full h-full"
            ref={canvasRef}
            width={width}
            height={height}
            tabIndex={0}
            aria-label={`${title} Unity WebGL content`}
            onContextMenu={(e) => e.preventDefault()}
          />

          {!isLoading && instance && (
            <div className="p-2 bg-base-200 flex justify-between items-center">
              <div className="text-sm">
                <span className="text-success font-medium">Running</span> •{" "}
                {productName} {version}
              </div>
              <div>
                <button className="btn btn-sm mr-2" onClick={restart}>
                  Restart
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => instance.SetFullscreen(1)}
                >
                  Fullscreen
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);

UnityPlayer.displayName = "UnityPlayer";

export default UnityPlayer;
