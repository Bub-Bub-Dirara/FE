import { useState } from "react";
import StepBox from "./stepbox";

const NavbarStep = () => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null); 
  const [used, setUsed] = useState<boolean[]>([false, false, false]); 

  const steps = ["계약서 업로드", "위험 조항 분류", "법령·판례 조합 매핑"];

  const handleClick = (index: number) => {
    setSelectedIndex(index);

    setUsed((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  };

  return (
    <div className="flex flex-row">
      {steps.map((text, idx) => (
        <StepBox
          key={idx}
          text={text}
          selected={selectedIndex === idx}
          used={used[idx]}
          onClick={() => handleClick(idx)}
          className={idx === 0 ? "z-30" : idx === 1 ? "-ml-8 z-20" : "-ml-8 z-10"}
        />
      ))}
    </div>
  );
};

export default NavbarStep;