import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Building2,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  Printer,
  QrCode,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";

import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute(
  "/admin/branches",
)({
  component: AdminBranchesPage,
});

type BranchRow = {
  id: string;
  name_en: string;
  name_ar: string;
  address_en?: string | null;
  address_ar?: string | null;
  created_at?: string | null;
};

function AdminBranchesPage() {
  const { t } = useI18n();

  const [rows, setRows] = useState<BranchRow[]>([]);

  const [form, setForm] = useState({
    name_en: "",
    name_ar: "",
    address_en: "",
  });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: queryError } =
      await supabase
        .from("branches")
        .select("*")
        .order("name_en");

    if (queryError) {
      setError(queryError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data ?? []) as BranchRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  async function createBranch(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setBusy(true);
    setMessage(null);
    setError(null);

    const { error: insertError } =
      await supabase
        .from("branches")
        .insert({
          name_en: form.name_en.trim(),
          name_ar: form.name_ar.trim(),
          address_en:
            form.address_en.trim() || null,
        });

    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setForm({
      name_en: "",
      name_ar: "",
      address_en: "",
    });

    setMessage(
      "Branch created successfully.",
    );

    await loadBranches();
  }

  return (
    <div className="w-full min-w-0">
      <div className="kob-page-header">
        <div>
          <h1 className="kob-page-title">
            {t("tab_branches")}
          </h1>

          <p className="kob-page-description">
            Create branches and generate a permanent QR code for each branch.
          </p>
        </div>
      </div>

      <section className="panel-warm kob-content-card mb-6">
        <div className="kob-card-header">
          <div className="flex items-center gap-3">
            <span className="kob-stat-icon">
              <Building2 className="h-5 w-5" />
            </span>

            <h2 className="kob-card-title">
              {t("new_branch")}
            </h2>
          </div>
        </div>

        <form
          onSubmit={createBranch}
          className="kob-form-grid"
        >
          <FormInput
            label={`${t("f_name")} (EN)`}
            value={form.name_en}
            required
            onChange={(value) => {
              setForm((current) => ({
                ...current,
                name_en: value,
              }));
            }}
          />

          <FormInput
            label={`${t("f_name")} (AR)`}
            value={form.name_ar}
            required
            onChange={(value) => {
              setForm((current) => ({
                ...current,
                name_ar: value,
              }));
            }}
          />

          <FormInput
            label={t("f_address")}
            value={form.address_en}
            onChange={(value) => {
              setForm((current) => ({
                ...current,
                address_en: value,
              }));
            }}
          />

          <button
            type="submit"
            disabled={busy}
            className="btn-brass kob-form-button"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}

            <span>
              {t("btn_create")}
            </span>
          </button>
        </form>

        {message && (
          <div className="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-200">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
      </section>

      {loading ? (
        <div className="panel flex min-h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-caramel" />
        </div>
      ) : (
        <div className="kob-branches-grid">
          {rows.map((branch) => (
            <BranchQrCard
              key={branch.id}
              branch={branch}
            />
          ))}

          {rows.length === 0 && (
            <div className="panel col-span-full p-10 text-center text-cream-dim">
              {t("empty_branches")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BranchQrCard({
  branch,
}: {
  branch: BranchRow;
}) {
  const qrWrapperRef =
    useRef<HTMLDivElement | null>(null);

  const [copied, setCopied] =
    useState(false);

  const branchUrl =
    typeof window === "undefined"
      ? `/scan?branch=${encodeURIComponent(
          branch.id,
        )}`
      : `${window.location.origin}/scan?branch=${encodeURIComponent(
          branch.id,
        )}`;

  function downloadQrCode() {
    const canvas =
      qrWrapperRef.current?.querySelector(
        "canvas",
      );

    if (!canvas) return;

    const downloadCanvas =
      document.createElement("canvas");

    const context =
      downloadCanvas.getContext("2d");

    if (!context) return;

    const width = 1200;
    const height = 1500;

    downloadCanvas.width = width;
    downloadCanvas.height = height;

    context.fillStyle = "#f8f1e7";
    context.fillRect(
      0,
      0,
      width,
      height,
    );

    context.fillStyle = "#211008";
    context.textAlign = "center";

    context.font =
      "bold 72px Georgia, serif";

    context.fillText(
      "KOB",
      width / 2,
      120,
    );

    context.font =
      "bold 46px Arial, sans-serif";

    context.fillText(
      branch.name_en,
      width / 2,
      200,
    );

    context.font =
      "40px Arial, sans-serif";

    context.fillText(
      branch.name_ar,
      width / 2,
      270,
    );

    const qrSize = 850;
    const qrX =
      (width - qrSize) / 2;

    const qrY = 350;

    context.drawImage(
      canvas,
      qrX,
      qrY,
      qrSize,
      qrSize,
    );

    context.font =
      "bold 38px Arial, sans-serif";

    context.fillText(
      "Scan to order your coffee",
      width / 2,
      1280,
    );

    context.font =
      "36px Arial, sans-serif";

    context.fillText(
      "امسح الكود لطلب قهوتك",
      width / 2,
      1340,
    );

    context.font =
      "24px Arial, sans-serif";

    context.fillStyle = "#6f513f";

    context.fillText(
      branchUrl,
      width / 2,
      1420,
    );

    const link =
      document.createElement("a");

    const safeName =
      branch.name_en
        .trim()
        .replace(
          /[^a-zA-Z0-9-_]+/g,
          "-",
        )
        .replace(/^-+|-+$/g, "") ||
      "branch";

    link.download =
      `KOB-${safeName}-QR.png`;

    link.href =
      downloadCanvas.toDataURL(
        "image/png",
      );

    link.click();
  }

  function printQrCode() {
    const canvas =
      qrWrapperRef.current?.querySelector(
        "canvas",
      );

    if (!canvas) return;

    const qrImage =
      canvas.toDataURL("image/png");

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=900,height=1000",
      );

    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />

          <title>
            KOB - ${escapeHtml(branch.name_en)}
          </title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #ffffff;
              color: #211008;
              font-family: Arial, sans-serif;
            }

            .qr-sheet {
              width: 700px;
              padding: 55px;
              border: 4px solid #a86c2a;
              border-radius: 32px;
              text-align: center;
            }

            .brand {
              margin-bottom: 12px;
              font-family: Georgia, serif;
              font-size: 64px;
              font-weight: 700;
              letter-spacing: 8px;
              color: #8a501e;
            }

            h1 {
              margin: 0;
              font-size: 38px;
            }

            .arabic-name {
              margin-top: 10px;
              font-size: 32px;
              direction: rtl;
            }

            .qr-image {
              width: 480px;
              height: 480px;
              margin: 40px auto;
              display: block;
            }

            .scan-en {
              margin: 0;
              font-size: 31px;
              font-weight: 700;
            }

            .scan-ar {
              margin: 12px 0 0;
              font-size: 31px;
              font-weight: 700;
              direction: rtl;
            }

            .url {
              margin-top: 26px;
              font-size: 15px;
              color: #72523c;
              overflow-wrap: anywhere;
            }

            @media print {
              body {
                min-height: auto;
              }

              .qr-sheet {
                border-color: #8a501e;
              }
            }
          </style>
        </head>

        <body>
          <section class="qr-sheet">
            <div class="brand">
              KOB
            </div>

            <h1>
              ${escapeHtml(branch.name_en)}
            </h1>

            <div class="arabic-name">
              ${escapeHtml(branch.name_ar)}
            </div>

            <img
              class="qr-image"
              src="${qrImage}"
              alt="Branch QR code"
            />

            <p class="scan-en">
              Scan to order your coffee
            </p>

            <p class="scan-ar">
              امسح الكود لطلب قهوتك
            </p>

            <div class="url">
              ${escapeHtml(branchUrl)}
            </div>
          </section>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  async function copyBranchUrl() {
    try {
      await navigator.clipboard.writeText(
        branchUrl,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <article className="panel kob-branch-card flex min-w-0 flex-col">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-xl font-bold text-cream">
            {branch.name_en}
          </h3>

          <p
            className="mt-1 text-sm text-caramel"
            dir="rtl"
          >
            {branch.name_ar}
          </p>

          <p className="mt-3 text-sm text-cream-dim">
            {branch.address_en || "—"}
          </p>
        </div>

        <span className="kob-stat-icon">
          <QrCode className="h-5 w-5" />
        </span>
      </div>

      <div className="hairline-divider my-5" />

      <div
        ref={qrWrapperRef}
        className="mx-auto rounded-2xl bg-[#f8f1e7] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
      >
        <QRCodeCanvas
          value={branchUrl}
          size={220}
          level="H"
          includeMargin
          bgColor="#f8f1e7"
          fgColor="#211008"
          imageSettings={{
            src: "/favicon.ico",
            width: 34,
            height: 34,
            excavate: true,
          }}
        />
      </div>

      <div className="kob-neo-inset mt-4 rounded-xl p-3 text-center">
        <p className="text-sm font-semibold text-cream">
          Scan to order
        </p>

        <p
          className="mt-1 text-sm text-caramel"
          dir="rtl"
        >
          امسح الكود لطلب القهوة
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          void copyBranchUrl();
        }}
        className="kob-neo-inset mt-3 w-full truncate rounded-lg px-3 py-2 text-xs text-cream-dim transition hover:text-caramel-bright"
        title={branchUrl}
      >
        {copied
          ? "Link copied"
          : branchUrl}
      </button>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={downloadQrCode}
          className="btn-brass flex items-center justify-center gap-2 px-3 py-3 text-sm"
        >
          <Download className="h-4 w-4" />

          <span>
            Download
          </span>
        </button>

        <button
          type="button"
          onClick={printQrCode}
          className="btn-ghost-brass flex items-center justify-center gap-2 px-3 py-3 text-sm"
        >
          <Printer className="h-4 w-4" />

          <span>
            Print
          </span>
        </button>
      </div>

      <a
        href={branchUrl}
        target="_blank"
        rel="noreferrer"
        className="btn-ghost-brass mt-3 flex w-full items-center justify-center gap-2 px-4 py-3 text-sm"
      >
        <ExternalLink className="h-4 w-4" />

        <span>
          Test customer page
        </span>
      </a>
    </article>
  );
}

type FormInputProps = {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  required?: boolean;
};

function FormInput({
  label,
  value,
  onChange,
  required = false,
}: FormInputProps) {
  return (
    <label className="block min-w-0">
      <span className="kob-field-label">
        {label}
      </span>

      <input
        type="text"
        value={value}
        required={required}
        onChange={(event) => {
          onChange(
            event.target.value,
          );
        }}
        className="inset-well kob-field-control"
      />
    </label>
  );
}

function escapeHtml(
  value: string,
) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
