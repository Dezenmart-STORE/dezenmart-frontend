import type { ReactNode } from "react";
import {
  HiCheckCircle,
  HiExclamationTriangle,
  HiInformationCircle,
  HiXCircle,
} from "react-icons/hi2";

export type StatusTone = "info" | "success" | "warning" | "danger";

/**
 * One box for status, success and failure messages, replacing the copies of
 * the red error box across the forms. Text colours are the 300 step of each
 * hue on its tinted fill, all 4.5:1 or better on the card surface.
 */
const TONES: Record<StatusTone, { box: string; text: string; Icon: typeof HiCheckCircle }> = {
  info: { box: "bg-[#3A3C41] border-[#4A4D54]", text: "text-gray-200", Icon: HiInformationCircle },
  success: { box: "bg-green-900/20 border-green-800/40", text: "text-green-300", Icon: HiCheckCircle },
  warning: { box: "bg-amber-900/20 border-amber-800/40", text: "text-amber-300", Icon: HiExclamationTriangle },
  danger: { box: "bg-red-900/20 border-red-800/40", text: "text-red-300", Icon: HiXCircle },
};

interface Props {
  tone: StatusTone;
  title?: ReactNode;
  children?: ReactNode;
  /** A trailing action, such as a Retry button. */
  action?: ReactNode;
  /** Danger and warning interrupt assistive tech; info and success don't. */
  announce?: boolean;
}

export default function StatusBox({ tone, title, children, action, announce }: Props) {
  const { box, text, Icon } = TONES[tone];
  const role = announce ?? (tone === "danger" || tone === "warning") ? "alert" : "status";
  return (
    <div role={role} className={`flex items-start gap-2.5 rounded-xl border px-3 py-3 ${box}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${text}`} aria-hidden />
      <div className={`min-w-0 flex-1 text-sm ${text}`}>
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? "mt-0.5 text-gray-300" : undefined}>{children}</div>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
