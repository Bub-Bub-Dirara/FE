import LoadingBase from "../../pages/LoadingPage";
import analysisPng from "../../assets/loading/2.png";

export default function AnalysisLoadingScreen() {
  return (
    <LoadingBase
      imageSrc={analysisPng}
      imageAlt="증거 자료 분석 중"
      title="파일을 분석 중이에요!"
      subtitle={
        <>
          업로드된 자료를 읽고, 증거 종류를 분류하고
          <br />
          위험할 수 있는 조항들을 찾는 중입니다.
        </>
      }
    />
  );
}
