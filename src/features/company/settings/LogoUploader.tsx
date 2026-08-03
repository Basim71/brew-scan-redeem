import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";

export function LogoUploader({
  value,
  onChange,
  disabled,
  isAr,
  folder,
  label,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  isAr: boolean;
  folder: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError(isAr ? "الملف ليس صورة" : "File is not an image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(isAr ? "الحجم الأقصى ٢ ميجابايت" : "Max size is 2 MB");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${folder}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("drink-images")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("drink-images").getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err: any) {
      setError(err?.message || (isAr ? "فشل الرفع" : "Upload failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cs-upload-wrap">
      <div
        className="cs-dropzone"
        data-over={over ? "true" : "false"}
        data-disabled={disabled ? "true" : "false"}
        role="button"
        tabIndex={0}
        aria-label={label || (isAr ? "رفع الشعار" : "Upload logo")}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
      >
        {value ? (
          <img src={value} alt={label || (isAr ? "الشعار" : "Logo")} />
        ) : busy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            <ImagePlus className="h-5 w-5" />
            <span>{isAr ? "اسحب الصورة أو اضغط للرفع" : "Drag an image or click to upload"}</span>
          </>
        )}
        {busy && value ? <div className="cs-dropzone-busy"><Loader2 className="h-4 w-4 animate-spin" /></div> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = "";
        }}
      />
      {value && !disabled ? (
        <button type="button" className="cs-ghost-btn" onClick={() => onChange(null)}>
          <Trash2 className="h-3.5 w-3.5" />
          {isAr ? "إزالة" : "Remove"}
        </button>
      ) : null}
      {error ? <span className="cs-error">{error}</span> : null}
    </div>
  );
}