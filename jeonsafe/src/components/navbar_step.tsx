import StepBox from "./stepbox";

const NavbarStep = () => {

    return (
        <div className="flex flex-row">
            <StepBox text="계약서 업로드" className="z-30"/>
            <StepBox text="위험 조항 분류" className="-ml-8 z-20"/>
            <StepBox text="법령·판례 조합 매핑" className="-ml-8 z-10"/>
        </div>
    )
}

export default NavbarStep;