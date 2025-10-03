interface StepBoxProps {
    text : string;
}

const StepBox = ({text} : StepBoxProps) => {
    return (
        <>
            <div className="rounded">{text}</div>
        </>
    )
}

export default StepBox;