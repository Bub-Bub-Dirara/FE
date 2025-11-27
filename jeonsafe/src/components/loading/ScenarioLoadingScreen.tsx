import LoadingBase from "../../pages/LoadingPage";
import scenarioPng from "../../assets/loading/3.png";

export default function ScenarioLoadingScreen() {
  return (
    <LoadingBase
      imageSrc={scenarioPng}
      imageAlt="재판 시나리오 준비 중"
      title="관련 법령·판례를 찾고 있어요!"
      subtitle={
        <>
          AI를 통해 관련 법령·판례를 찾고 있어요!
          <br />
          더 정확한 판단이 필요하다면 전문 법률상담가와 상담해 보시는 걸 추천드려요.
        </>
      }
    />
  );
}
