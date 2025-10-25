import StepBox from "./stepbox";
import { useLocation, useNavigate } from "react-router-dom";

const PRE_STEPS = [
  { label: "계약서 업로드", path: "/pre/upload" },
  { label: "위험 조항 분류", path: "/pre/risk" },
  { label: "법령·판례 조합 매핑", path: "/pre/mapping" },
];

const POST_STEPS = [
  { label: "피해 증명 자료 수집", path: "/post/collect" },
  { label: "증거 자료 분류", path: "/post/classify" },
  { label: "재판 시뮬레이션", path: "/post/simulate" },
];

export default function NavbarStep() {
  const location = useLocation();
  const navigate = useNavigate();

  const isPre = location.pathname.startsWith("/pre");
  const steps = isPre ? PRE_STEPS : POST_STEPS;
  
  const activeIndexRaw = steps.findIndex(s => location.pathname.startsWith(s.path));
  const activeIndex = activeIndexRaw >= 0 ? activeIndexRaw : 0;

  const nextAllowed = Math.min(activeIndex + 1, steps.length - 1);

  return (
    <div className="flex flex-row">
      {steps.map((s, idx) => {
        const isDisabled = idx > nextAllowed;
        const used = idx < activeIndex;

        return (
          <StepBox
            key={s.path}
            text={s.label}
            selected={activeIndex === idx}
            used={used}
            disabled={isDisabled}
            onClick={() => {
              if (isDisabled) return;
              navigate(s.path);
            }}
            className={idx === 0 ? "z-30" : idx === 1 ? "-ml-8 z-20" : "-ml-8 z-10"}
          />
        );
      })}
    </div>
  );
}
