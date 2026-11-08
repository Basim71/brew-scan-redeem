import { useEffect, useRef } from "react";

/** Reads a QR code from the device camera. The scanning library loads only in the browser. */
export function CameraScanner({ onResult, onError }: { onResult: (text: string) => void; onError: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const done = useRef(false);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (cancelled || !videoRef.current) return;
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current,
          (result) => {
            if (result && !done.current) {
              done.current = true;
              controls.stop();
              onResult(result.getText());
            }
          },
        );
        stop = () => controls.stop();
        if (cancelled) stop();
      } catch {
        if (!cancelled) onError();
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="kob-camera-scanner">
      <video ref={videoRef} muted playsInline className="w-full rounded-xl" style={{ maxHeight: 320, objectFit: "cover" }} />
    </div>
  );
}
