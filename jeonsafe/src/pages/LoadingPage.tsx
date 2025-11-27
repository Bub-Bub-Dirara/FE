import type { ReactNode } from "react";

type Props = {
  imageSrc: string;
  imageAlt?: string;
  title: string;
  subtitle?: ReactNode;
};

export default function LoadingBase({
  imageSrc,
  imageAlt = "로딩 중",
  title,
  subtitle,
}: Props) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-6">
        <img src={imageSrc} alt={imageAlt} className="w-52 max-w-[60vw]" />
        <div className="text-center">
          <p className="text-xl font-bold text-[#113F67] mb-2">{title}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
