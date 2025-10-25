import HomeBox from "../components/homebox";

const HomePage = () => {
    return (
        <div className="w-full">
            <section className="max-w-[1100px] mx-auto px-6 py-14 mt-16">
                <h1 className="text-center font-extrabold leading-tight text-[#113F67] text-[40px] md:text-[50px]">
                    <span className="mr-2">“</span>
                    전세 계약, 안전하게 할 수 있을까?
                    <span className="ml-2">”</span>
                </h1>

                <div className="mt-18 grid grid-cols-1 md:grid-cols-2 gap-12 justify-items-center">
                    <HomeBox
                        section="사전 대비"
                        introduce="전세 계약 전이거나 전세 계약을 생각 중이에요!"
                        to="/pre/upload"
                    />
                    <HomeBox
                        section="사후 처리"
                        introduce="전세 사기를 당한 것 같아요."
                        to="/post/collect"
                    />
                </div>
            </section>
        </div>
    )
}

export default HomePage;