import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { ArrowsUpDownIcon } from "@heroicons/react/24/outline";


import NextStepButton from "../components/NextStepButton";
import BucketSection from "../components/classify/BucketSection";
import {
  BUCKET_META,
  BUCKET_ORDER,
  type Buckets,
  type BucketKey,
  type Item,
} from "../types/evidence";
import { useProgress } from "../stores/useProgress";
import { useUploadStore } from "../stores/useUploadStore";
import {
  analyzeFilesWithGpt,
  type AnalyzeItem,
  type RatingLabel,
} from "../lib/analyzeEvidence";

export default function ClassifyPage() {
  const { setPos } = useProgress();
  useEffect(() => {
    setPos("post", 1);
  }, [setPos]);

  // CollectPage에서 저장한 업로드 결과
  const uploaded = useUploadStore((s) => s.uploaded);
  const storeAnalysisById = useUploadStore((s) => s.analysisById);
  const setAnalysisByIdStore = useUploadStore((s) => s.setAnalysisById);
  
  
  // 빈 버킷 템플릿
  const emptyBuckets: Buckets = useMemo(
    () => ({
      contract: [],
      sms: [],
      deposit: [],
      me: [],
      landlord: [],
      other: [],
    }),
    [],
  );

  // 버킷 상태
  const [buckets, setBuckets] = useState<Buckets>(emptyBuckets);

  // GPT 분석 결과 (파일 id -> 분석)
  const [analysisById, setAnalysisById] = useState<Record<string, AnalyzeItem>>(
    {},
  );
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    if (!uploaded || uploaded.length === 0) {
      setBuckets(emptyBuckets);
      setAnalysisById({});
      setAnalysisByIdStore({});
      return;
    }

    // 현재 업로드된 파일 id 리스트
    const fileIds = uploaded.map((f) => String(f.id));

    // 스토어에 이 파일들 분석 결과가 모두 있는지 확인
    const hasAllFromStore = fileIds.every((id) => !!storeAnalysisById[id]);
    
    // 공통: 분석 결과로 버킷 구성하는 helper
    const buildBucketsFromAnalysis = (
      analysisMap: Record<string, AnalyzeItem>,
    ) => {
      const nextBuckets: Buckets = {
        contract: [],
        sms: [],
        deposit: [],
        me: [],
        landlord: [],
        other: [],
      };

      uploaded.forEach((file) => {
        const id = String(file.id);
        const ai = analysisMap[id];

        const aiKind = (ai?.kind ?? "other") as BucketKey;
        const kind: BucketKey = (BUCKET_ORDER as BucketKey[]).includes(aiKind)
          ? aiKind
          : "other";

        const item: Item = {
          id,
          name: file.original_filename,
        };

        nextBuckets[kind].push(item);
      });

      setBuckets(nextBuckets);
    };

    // 이미 분석 결과가 있으면: API 안 부르고 그걸로 세팅
    if (hasAllFromStore) {
      setAnalysisById(storeAnalysisById);
      buildBucketsFromAnalysis(storeAnalysisById);
      return;
    }

    
    const run = async () => {
      try {
        setLoadingAnalysis(true);
        setAnalysisError(null);

        // 1) GPT 분석 호출
        const aiItems = await analyzeFilesWithGpt(uploaded);

        // 2) 응답 기반으로 버킷 채우기
        const nextBuckets: Buckets = {
          contract: [],
          sms: [],
          deposit: [],
          me: [],
          landlord: [],
          other: [],
        };
        const nextAnalysis: Record<string, AnalyzeItem> = {};

        uploaded.forEach((file, idx) => {
          const id = String(file.id);
          const ai = aiItems[idx];

          const aiKind = (ai?.kind ?? "other") as BucketKey;
          const kind: BucketKey = (BUCKET_ORDER as BucketKey[]).includes(aiKind)
            ? aiKind
            : "other";

          const item: Item = {
            id,
            name: file.original_filename,
          };

          nextBuckets[kind].push(item);
          if (ai) nextAnalysis[id] = ai;
        });

        setBuckets(nextBuckets);
        setAnalysisById(nextAnalysis);
        setAnalysisByIdStore(nextAnalysis); 
      } catch (e) {
        console.error("analyze error", e);
        setAnalysisError("AI 분석에 실패해서, 일단 전부 ‘기타’에 넣어둘게요.");

        // 실패 시: 원래처럼 모두 other 버킷에
        const others: Item[] = uploaded.map((r) => ({
          id: String(r.id),
          name: r.original_filename,
        }));
        setBuckets({ ...emptyBuckets, other: others });
        setAnalysisById({});
        setAnalysisByIdStore({}); 
      } finally {
        setLoadingAnalysis(false);
      }
    };

    void run();
  }, [uploaded, emptyBuckets,storeAnalysisById, setAnalysisByIdStore]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const allIds = useMemo(
    () => Object.values(buckets).flatMap((arr) => arr.map((i) => i.id)),
    [buckets],
  );

  const findContainer = (
    idOrBucket: UniqueIdentifier | BucketKey,
  ): BucketKey | null => {
    const key = String(idOrBucket);
    if ((BUCKET_ORDER as string[]).includes(key)) return key as BucketKey;
    for (const k of BUCKET_ORDER)
      if (buckets[k].some((it) => it.id === key)) return k;
    return null;
  };

  const getItemById = (id: string | null): Item | null => {
    if (!id) return null;
    for (const arr of Object.values(buckets)) {
      const found = arr.find((i) => i.id === id);
      if (found) return found;
    }
    return null;
  };

  const moveItemTo = (itemId: string, to: BucketKey) => {
    const from = findContainer(itemId);
    if (!from || from === to) return;
    setBuckets((prev) => {
      const fromArr = prev[from];
      const idx = fromArr.findIndex((i) => i.id === itemId);
      if (idx < 0) return prev;
      const item = fromArr[idx];
      const newFrom = [...fromArr];
      newFrom.splice(idx, 1);
      const newTo = [...prev[to], item];
      return { ...prev, [from]: newFrom, [to]: newTo };
    });
  };

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragOver = (e: DragOverEvent) => {
    const active = String(e.active.id);
    const overId = e.over?.id ?? null;
    if (overId == null) return;

    const from = findContainer(active);
    const to = findContainer(overId);
    if (!from || !to || from === to) return;

    setBuckets((prev) => {
      const fromItems = prev[from];
      const activeIdx = fromItems.findIndex((i) => i.id === active);
      if (activeIdx === -1) return prev;

      const item = fromItems[activeIdx];
      const newFrom = [...fromItems];
      newFrom.splice(activeIdx, 1);

      const toItems = prev[to];
      let insertIdx = toItems.length;
      const overStr = String(overId);
      if (allIds.includes(overStr)) {
        const overIdx = toItems.findIndex((i) => i.id === overStr);
        insertIdx = overIdx >= 0 ? overIdx : toItems.length;
      }
      const newTo = [...toItems];
      newTo.splice(insertIdx, 0, item);

      return { ...prev, [from]: newFrom, [to]: newTo };
    });
  };

  const onDragEnd = (e: DragEndEvent) => {
    const active = String(e.active.id);
    const overId = e.over?.id ?? null;

    const from = findContainer(active);
    const to = overId ? findContainer(overId) : null;

    if (from && to && from === to && overId) {
      setBuckets((prev) => {
        const arr = prev[from];
        const oldIndex = arr.findIndex((i) => i.id === active);
        const newIndex = arr.findIndex((i) => i.id === String(overId));
        if (oldIndex === -1 || newIndex === -1) return prev;
        return { ...prev, [from]: arrayMove(arr, oldIndex, newIndex) };
      });
    }
    setActiveId(null);
  };

  const activeItem = getItemById(activeId);
  
  const getRatingForId = (id: string): RatingLabel | undefined =>
    analysisById[id]?.rating.label;

  const getAnalysisForId = (id: string): AnalyzeItem | undefined =>
    analysisById[id];

  return (
    <div className="min-h-dvh overflow-hidden bg-white">
      <main
        className="h-dvh overflow-y-auto scrollbar-hidden
                   [--topbar-h:50px] [--footer-h:112px]
                   pt-[var(--topbar-h)]
                   pb-[calc(var(--footer-h)+env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto max-w-4xl px-6 pt-2 pb-4">
          <h1 className="text-2xl font-bold text-[#113F67]">증거 자료 분류</h1>
          <p className="mt-2 text-sm text-gray-600">
            아이콘(위/아래)으로 드래그해서 위치를 옮기고, 파일 이름을 클릭하면
            AI가 판단한 이유를 볼 수 있어요.
          </p>
          {loadingAnalysis && (
            <p className="mt-2 text-xs text-emerald-700">
              업로드한 자료를 분석 중입니다...
            </p>
          )}
          {analysisError && (
            <p className="mt-1 text-xs text-rose-600">{analysisError}</p>
          )}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="space-y-10 pb-4">
            {BUCKET_ORDER.map((k) => (
              <BucketSection
                key={k}
                id={k}
                title={BUCKET_META[k].title}
                items={buckets[k]}
                bucketOrder={BUCKET_ORDER}
                onMoveItem={moveItemTo}
                getRating={getRatingForId}
                getAnalysis={getAnalysisForId}
              />
            ))}
          </div>

          <DragOverlay>
            {activeItem ? (
              <div className="w-[640px] max-w-[72vw]">
                <div className="flex items-center justify-between rounded-xl bg-gray-100 px-5 py-3 shadow-lg">
                  <span className="truncate text-[15px] text-gray-800">
                    {activeItem.name}
                  </span>
                  <ArrowsUpDownIcon className="h-4 w-4 text-gray-500" />
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div
          aria-hidden
          className="h-[calc(var(--footer-h)+env(safe-area-inset-bottom))]"
        />
      </main>

      <NextStepButton
        to="/post/simulate"
        label="다음 단계로 넘어갈까요?"
      />
    </div>
  );
}