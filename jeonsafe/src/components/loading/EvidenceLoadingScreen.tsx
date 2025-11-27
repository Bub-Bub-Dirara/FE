import LoadingBase from "../../pages/LoadingPage";
import uploadPng from "../../assets/loading/1.png";

export default function EvidenceLoadingScreen() {
  return (
    <LoadingBase
      imageSrc={uploadPng}
      imageAlt="증거 자료 업로드 중"
      title="자료를 업로드하고 있어요!"
      subtitle={
        <>
          업로드하신 파일을 저장하고, 분석하는 중입니다.
          <br />
          잠시만 기다려 주세요.
        </>
      }
    />
  );
}
